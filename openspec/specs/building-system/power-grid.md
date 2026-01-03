> **System:** building-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Power Grid & Energy System Specification (UNIFIED)

**Version:** 2.0
**Status:** Unified with AUTOMATION_LOGISTICS_SPEC.md
**Integration:** Reality Anchor System, Tech Rebellion Path, Factorio Automation
**Related Specs:**
- [AUTOMATION_LOGISTICS_SPEC.md](./AUTOMATION_LOGISTICS_SPEC.md) (Power System, Clarke Tech)
- [DIVINE_PROGRESSION_SPEC.md](./DIVINE_PROGRESSION_SPEC.md) (Phase 4: Cosmic Rebellion)

---

## Overview

This spec unifies the power grid system for both **Factorio-style automation** and the **Reality Anchor** (god-killing device). It extends the automation spec's power system with stellar-scale energy sources required for the Tech Rebellion endgame.

**Key Principle:** To kill a god, you need the power of a star.

The **Reality Anchor** requires **50,000 MW (50 GW) continuous** to maintain the reality nullification field that makes gods mortal. This necessitates stellar energy harvesting via Dyson Sphere or equivalent Clarke Tech power sources.

## Core Concepts

### Power Units
**All power measured in kilowatts (kW)** following AUTOMATION_LOGISTICS_SPEC.md:
- **1 kW** = 1 kilowatt
- **1 MW** = 1,000 kW (megawatt)
- **1 GW** = 1,000,000 kW (gigawatt)
- **1 TW** = 1,000,000,000 kW (terawatt)

### Power States
1. **Surplus**: Generation > Consumption (charge batteries)
2. **Balanced**: Generation = Consumption (stable)
3. **Deficit**: Generation < Consumption (drain batteries, potential brownout)
4. **Blackout**: No power available (critical systems offline)

---

## Power Component System

**Uses PowerComponent from AUTOMATION_LOGISTICS_SPEC.md:**

```typescript
/**
 * Power producer/consumer component (from AUTOMATION spec)
 * Attached to entities that generate or consume power
 */
interface PowerComponent extends Component {
  readonly type: 'power';

  /** Is this a producer, consumer, or both? */
  role: 'producer' | 'consumer' | 'storage';

  /** Current power generation (kW) - for producers */
  generation?: number;

  /** Power consumption (kW) - for consumers */
  consumption?: number;

  /** Stored power (kWh) - for storage */
  stored?: number;
  capacity?: number;

  /** Power source type */
  powerType: PowerType;

  /** Is this machine currently powered? */
  isPowered: boolean;

  /** Efficiency modifier (0-1) */
  efficiency: number;
}

type PowerType =
  | 'mechanical'   // Wind/water powered (Tier 2)
  | 'electrical'   // Coal/solar powered (Tier 3-4)
  | 'arcane'       // Mana/ley line powered (Tier 5)
  | 'exotic'       // Zero-point/quantum (Tier 6-7)
  | 'stellar';     // Dyson sphere/star harvesting (Tier 8 - God-Killing)
```

## Power Progression Tiers

### Tier 1-4: Standard Automation (AUTOMATION_LOGISTICS_SPEC.md)
- **Windmill**: 50-75 kW (mechanical, weather-dependent)
- **Waterwheel**: 75 kW (mechanical, requires water)
- **Steam Engine**: 300 kW (electrical, coal-powered)
- **Solar Panel**: 150 kW (electrical, day-dependent)

### Tier 5: Arcane Power
- **Ley Generator**: 1,000 kW (1 MW) - Infinite if on ley line
- **Mana Condenser**: 500 kW - Converts mana to electricity

### Tier 6-7: Clarke Tech (Exotic Physics)
- **Fusion Reactor**: 10,000 kW (10 MW) - Requires exotic fuel
- **Zero-Point Extractor**: 100,000 kW (100 MW) - Infinite but risky
  - Destabilizes spacetime
  - 1% vacuum decay risk per hour
  - May destroy local reality

### Tier 8: God-Killing Tech (Stellar Engineering)

**To make gods mortal requires stellar-scale power.**

```typescript
/**
 * Dyson Swarm Controller - Manages orbital solar collector swarm
 * Tracks satellites in orbit and coordinates power collection
 */
interface DysonSwarmComponent extends Component {
  readonly type: 'dyson_swarm';

  /** Star being harvested */
  starId: string;
  starType: 'red_dwarf' | 'yellow_sun' | 'blue_giant';

  /** Swarm statistics */
  activeSatellites: number;      // Satellites currently operational
  damagedSatellites: number;     // Satellites needing repair
  totalSatellitesLaunched: number;

  /** Power generation */
  powerPerSatellite: number;     // kW per satellite (varies by star type)
  currentGeneration: number;     // Total output from all active satellites

  /** Swarm density (0-1, affects efficiency) */
  swarmDensity: number;          // How much of orbit is covered
  optimalDensity: number;        // Target density for max efficiency

  /** Self-replication (if enabled via research) */
  selfReplicating: boolean;
  constructorSatellites: number; // Satellites that build more satellites
  replicationRate: number;       // New satellites per hour

  /** Risk factors */
  collisionRisk: number;         // Risk of satellites colliding
  stellarFlareRisk: number;      // Chance of damage from star
  orbitalDecayRate: number;      // Satellites lost per year
}

/**
 * Solar Satellite - Individual orbital collector
 * Built on ground, launched into orbit
 */
interface SolarSatelliteComponent extends Component {
  readonly type: 'solar_satellite';

  /** Orbital status */
  status: 'grounded' | 'launching' | 'orbital' | 'damaged' | 'destroyed';
  orbitAltitude: number;         // km above star surface
  orbitalPeriod: number;         // hours per orbit

  /** Power generation */
  powerOutput: number;           // kW generated
  efficiency: number;            // 0-1, degraded by damage/age

  /** Linked swarm */
  swarmId?: string;              // Which Dyson Swarm this belongs to

  /** Damage tracking */
  health: number;                // 0-100
  lastMaintenanceAt: number;

  /** Age tracking */
  launchDate: number;
  operationalTime: number;       // Ticks in orbit
}

/**
 * Stellar Relay Station
 * Beams energy from Dyson Swarm to planetary surface
 */
interface StellarRelayComponent extends Component {
  readonly type: 'stellar_relay';

  /** Connected Dyson Swarm */
  dysonSwarmId: string;

  /** Power transmission capacity (kW) */
  transmissionCapacity: number;

  /** Current power being beamed (kW) */
  currentTransmission: number;

  /** Transmission efficiency (0-1, affected by distance/interference) */
  efficiency: number;

  /** Beam alignment (requires orbital mechanics) */
  alignmentQuality: number;     // 0-1

  /** Safety */
  beamSafetyProtocol: boolean;  // Don't vaporize cities
  civilianCasualties: number;   // Whoops
}

// Building Definitions

const SOLAR_SATELLITE_FACTORY = defineBuildingBlueprint({
  id: 'solar_satellite_factory',
  name: 'Solar Satellite Factory',
  description: 'Manufactures orbital solar collectors for Dyson Swarm. Launch them into orbit.',
  cost: [
    { itemId: 'exotic_matter', amount: 500 },
    { itemId: 'quantum_processor', amount: 100 },
    { itemId: 'assembly_line', amount: 50 },
  ],
  buildTime: 5000,
  functionality: [
    {
      type: 'crafting',
      recipeId: 'solar_satellite',
      automationEnabled: true,
      craftingSpeed: 1.0,
    },
  ],
  requiredResearch: 'stellar_engineering',
});

const SOLAR_SATELLITE_ITEM = defineItem({
  id: 'solar_satellite',
  name: 'Solar Satellite',
  category: 'machine',
  weight: 1000,  // Very heavy
  stackSize: 1,  // Cannot stack
  craftingRecipe: {
    id: 'solar_satellite',
    inputs: [
      { itemId: 'exotic_matter', amount: 100 },
      { itemId: 'solar_panel_array', amount: 50 },
      { itemId: 'quantum_processor', amount: 10 },
      { itemId: 'thruster_assembly', amount: 5 },
      { itemId: 'power_transmitter', amount: 1 },
    ],
    output: { itemId: 'solar_satellite', amount: 1 },
    craftingTime: 1000,  // ~50 seconds to build one
  },
  help: {
    summary: 'Orbital solar collector. Launch into space to build Dyson Swarm.',
    description: 'Self-contained solar power satellite. Once launched, orbits the star and beams energy to Stellar Relay. Each satellite generates 100 MW. Build hundreds for god-killing power levels.',
    warnings: [
      'Requires Mass Driver to launch into orbit',
      'Cannot be recovered once launched',
      'Subject to orbital decay and stellar flare damage',
    ],
  },
});

const MASS_DRIVER = defineBuildingBlueprint({
  id: 'mass_driver',
  name: 'Mass Driver',
  description: 'Electromagnetic catapult. Launches satellites into orbit at high velocity.',
  cost: [
    { itemId: 'exotic_matter', amount: 200 },
    { itemId: 'electromagnet', amount: 500 },
    { itemId: 'power_conduit', amount: 1000 },
    { itemId: 'targeting_computer', amount: 50 },
  ],
  buildTime: 3000,
  functionality: [
    {
      type: 'mass_driver',
      launchCapacity: 1000,        // Max kg per launch
      launchVelocity: 11000,       // m/s (orbital velocity)
      energyPerLaunch: 50000,      // 50 MW-seconds per launch
      cooldownTime: 600,           // 30 seconds between launches
    },
  ],
  requiredResearch: 'stellar_engineering',
  help: {
    summary: 'Launches satellites into orbit. Requires massive power surge.',
    description: 'Electromagnetic acceleration track that launches payloads to orbital velocity. Used primarily for Dyson Swarm construction. Each launch requires 50 MW-seconds of stored energy - use capacitor banks.',
    warnings: [
      'Requires 50 MW power surge per launch',
      'Must be built on equator for optimal launch efficiency',
      'Launch failures destroy the satellite',
    ],
  },
});

const STELLAR_RELAY = defineBuildingBlueprint({
  id: 'stellar_relay',
  name: 'Stellar Energy Relay',
  description: 'Receives energy beamed from Dyson Sphere. DO NOT STAND IN BEAM PATH.',
  cost: [
    { itemId: 'exotic_matter', amount: 500 },
    { itemId: 'receiver_array', amount: 100 },
    { itemId: 'heat_sink', amount: 1000 },  // Beam is HOT
    { itemId: 'targeting_computer', amount: 50 },
  ],
  buildTime: 5000,
  functionality: [
    {
      type: 'stellar_relay',
      transmissionCapacity: 100000000,  // 100 GW max (enough for 2 Reality Anchors)
      efficiency: 0.85,                 // 15% transmission loss
    },
  ],
  requiredResearch: 'stellar_engineering',
  help: {
    summary: 'Receives power from orbital Dyson Sphere. WARNING: Beam extremely dangerous.',
    description: 'Ground station for receiving energy transmitted via microwave beam from Dyson Sphere. The beam is focused stellar energy - DO NOT position near populated areas. Includes safety protocols to shut off beam if civilians detected in path, but accidents happen.',
    warnings: [
      'Beam path must be clear of civilians',
      'Requires line-of-sight to Dyson Sphere',
      'Beam can vaporize matter',
      'Safety protocols can fail',
    ],
  },
});
```

**Power Output:**
- **Single Satellite**: 100 MW (100,000 kW)
- **100 Satellites**: 10 GW
- **500 Satellites**: 50 GW (minimum for 1 Reality Anchor)
- **1,000 Satellites**: 100 GW (safe margin for god-killing)
- **10,000 Satellites**: 1 TW (can power 20 Reality Anchors simultaneously)

**Construction Workflow:**
1. **Build Solar Satellite Factory** (~2 hours build time)
2. **Automate satellite production** (~50 seconds per satellite)
3. **Build Mass Driver** (~1.5 hours build time)
4. **Launch satellites into orbit** (30 seconds per launch)
5. **Build Stellar Relay** to receive beamed power
6. **First power received** when first satellite reaches stable orbit (~10 minutes after launch)

**Incremental Power:**
- Power scales linearly with satellite count
- Can start using power after first ~50 satellites (5 GW)
- No waiting for "completion percentage"
- Launch more satellites anytime to increase capacity

**Self-Replication (Optional Research):**
- **Constructor Satellites**: Special satellites that build more satellites in orbit
- Requires: "Von Neumann Replication" research
- Exponential growth: Each constructor builds 1 new satellite per day
- Start with 10 constructors → 20 after 1 day → 40 after 2 days → 10,000 after ~10 days

---

## Storage Components

### PowerStorageComponent
interface PowerStorageComponent extends Component {
  type: 'power_storage';

  // Capacity
  storageType: StorageType;
  maxCapacity: number;           // Maximum EP stored
  currentCharge: number;         // Current EP stored

  // Transfer rates
  maxChargeRate: number;         // EP/tick input limit
  maxDischargeRate: number;      // EP/tick output limit

  // Degradation
  cycleCount: number;            // Charge/discharge cycles
  degradation: number;           // 0-1, reduces capacity over time

  // State
  status: 'empty' | 'charging' | 'discharging' | 'full' | 'degraded';
}

type StorageType =
  | 'battery_bank'      // Basic: 1000 EP capacity
  | 'capacitor_array'   // Fast discharge: 500 EP, high rate
  | 'quantum_battery'   // Advanced: 5000 EP capacity
  | 'dimensional_cell'; // Clarke Tech: 20000 EP capacity
```

### PowerGridComponent

```typescript
interface PowerGridComponent extends Component {
  type: 'power_grid';

  // Grid structure
  connectedGenerators: Set<string>;  // Entity IDs
  connectedStorage: Set<string>;     // Entity IDs
  connectedConsumers: Set<string>;   // Entity IDs (Reality Anchors, etc.)

  // Power flow
  totalGeneration: number;           // Sum of all generators (EP/tick)
  totalConsumption: number;          // Sum of all consumers (EP/tick)
  netFlow: number;                   // Generation - Consumption

  // Storage state
  totalStorageCapacity: number;
  totalStoredEnergy: number;

  // Grid health
  gridEfficiency: number;            // 0-1, transmission losses
  overloadRisk: number;              // 0-1, risk of grid failure

  // Stats
  peakGeneration: number;
  peakConsumption: number;
  blackoutCount: number;
  totalEnergyTransferred: number;
}
```

### PowerConsumerComponent

```typescript
interface PowerConsumerComponent extends Component {
  type: 'power_consumer';

  // Consumption
  basePowerDraw: number;             // EP/tick when running
  currentPowerDraw: number;          // Actual draw (may be throttled)
  priority: ConsumerPriority;

  // State
  isPowered: boolean;                // Currently receiving power
  powerSufficiency: number;          // 0-1, percentage of needed power received

  // Requirements
  minimumPower: number;              // EP/tick minimum to function
  optimalPower: number;              // EP/tick for 100% efficiency

  // Behavior on power loss
  onPowerLoss: 'shutdown' | 'degrade' | 'fail';
  gracefulShutdownTime?: number;     // Ticks before shutdown
}

type ConsumerPriority =
  | 'critical'    // Reality Anchor, life support
  | 'high'        // Defense systems, hospitals
  | 'normal'      // Industry, residential
  | 'low';        // Luxury, entertainment
```

---

## Power Grid System

### PowerGridSystem

**Responsibilities:**
1. Calculate total generation from all connected generators
2. Calculate total consumption from all connected consumers
3. Manage power storage charging/discharging
4. Distribute power based on priority during shortages
5. Handle blackouts and brownouts
6. Emit power-related events

**Update Flow:**

```typescript
update(world: World, currentTick: number) {
  for (const gridEntity of world.query(CT.PowerGrid)) {
    const grid = gridEntity.components.get(CT.PowerGrid);

    // 1. Calculate total generation
    let totalGen = 0;
    for (const genId of grid.connectedGenerators) {
      const gen = world.getEntity(genId)?.components.get(CT.PowerGenerator);
      if (gen?.status === 'running') {
        totalGen += gen.currentGeneration;
      }
    }

    // 2. Calculate total consumption
    let totalCons = 0;
    for (const consumerId of grid.connectedConsumers) {
      const consumer = world.getEntity(consumerId)?.components.get(CT.PowerConsumer);
      if (consumer) {
        totalCons += consumer.basePowerDraw;
      }
    }

    // 3. Determine net flow
    grid.netFlow = totalGen - totalCons;

    // 4. Handle surplus (charge batteries)
    if (grid.netFlow > 0) {
      this.chargeBatteries(world, grid, grid.netFlow, currentTick);
    }

    // 5. Handle deficit (discharge batteries or brownout)
    else if (grid.netFlow < 0) {
      const deficit = -grid.netFlow;
      const discharged = this.dischargeBatteries(world, grid, deficit, currentTick);

      if (discharged < deficit) {
        // Not enough battery power - implement brownout
        this.handlePowerShortage(world, grid, deficit - discharged, currentTick);
      }
    }

    // 6. Update all consumers
    this.updateConsumers(world, grid, currentTick);
  }
}
```

### Priority-Based Power Distribution

During power shortages:

1. **Calculate total available power**: `available = generation + battery_discharge`
2. **Sort consumers by priority**: Critical → High → Normal → Low
3. **Allocate power**:
   ```typescript
   let remaining = available;
   for (const consumer of sortedConsumers) {
     // Explicit bounded allocation: give consumer what they need OR what's left, whichever is smaller
     const requested = consumer.basePowerDraw;
     const allocated = (remaining >= requested) ? requested : remaining;

     consumer.currentPowerDraw = allocated;
     consumer.powerSufficiency = allocated / consumer.basePowerDraw;
     remaining -= allocated;

     if (remaining <= 0) break;
   }
   ```
4. **Handle unpowered consumers**:
   - `priority === 'critical'`: Emit emergency event
   - `onPowerLoss === 'shutdown'`: Graceful shutdown
   - `onPowerLoss === 'degrade'`: Reduce performance
   - `onPowerLoss === 'fail'`: Catastrophic failure

---

## Reality Anchor Integration

### Power Requirements

The **Reality Anchor** is the god-killing device for the Tech Rebellion path. It creates a 100-unit radius field that nullifies divine power, making gods mortal and killable.

**Power Consumption:**
- **50,000 MW (50 GW) continuous** when field active
- **5,000 MW (5 GW)** during charging phase
- **Status**: 'charging' → 'ready' → 'active'
- **Power Level**: 0-1 scale

**Why So Much Power?**
- Bending the laws of reality to nullify divine essence
- Maintaining field across 100-unit radius (31,416 square units)
- Continuous energy expenditure to keep gods mortal
- Field collapse if power drops below 25 GW (50% threshold)

**Minimum Power Infrastructure for One Reality Anchor:**
- **Option A**: Dyson Sphere at 10% completion = 100 GW (2x safety margin)
- **Option B**: 500× Zero-Point Extractors = 50 GW (no safety margin, high vacuum decay risk)
- **Option C**: 50,000× Fusion Reactors = 500 GW (requires massive exotic fuel supply)

### Integration Points

#### 1. RealityAnchorSystem Updates

**Current (TODO at line 80):**
```typescript
if (anchor.status === 'charging') {
  // TODO: Drain power from power grid/generator
  anchor.powerLevel = Math.min(1.0, anchor.powerLevel + 0.01);
  // ...
}
```

**Proposed Implementation:**
```typescript
if (anchor.status === 'charging') {
  const grid = this.findConnectedGrid(world, anchorId);
  if (!grid) {
    // No grid connected - stop charging
    return;
  }

  // Request power from grid (5 GW for charging)
  const powerNeeded = 5000000; // 5,000,000 kW = 5 GW
  const powerReceived = this.requestPower(grid, anchorId, powerNeeded);

  if (powerReceived >= powerNeeded) {
    // Full power - charge at normal rate
    const newPowerLevel = anchor.powerLevel + 0.01;

    if (newPowerLevel >= 1.0) {
      anchor.powerLevel = 1.0;
      anchor.status = 'ready';  // Fully charged
    } else {
      anchor.powerLevel = newPowerLevel;
    }
  } else if (powerReceived > 0) {
    // Partial power - charge slower
    const chargeRate = 0.01 * (powerReceived / powerNeeded);
    const newPowerLevel = anchor.powerLevel + chargeRate;

    if (newPowerLevel >= 1.0) {
      anchor.powerLevel = 1.0;
      anchor.status = 'ready';
    } else {
      anchor.powerLevel = newPowerLevel;
    }
  } else {
    // No power - can't charge
    this.eventBus?.emit({
      type: 'reality_anchor:power_loss',
      source: anchorId,
      data: { status: 'charging_interrupted' },
    });
  }
}
```

#### 2. Active Field Power Consumption

**Current (TODO at line 119):**
```typescript
private maintainField(...) {
  // TODO: Actually drain from power grid
  anchor.totalActiveTime++;
  // ...
}
```

**Proposed Implementation:**
```typescript
private maintainField(world: World, anchorId: string, anchor: RealityAnchorComponent, ...) {
  const grid = this.findConnectedGrid(world, anchorId);
  if (!grid) {
    // No grid - field collapses
    this.deactivateField(world, anchorId, anchor, 'power_loss');
    return;
  }

  // Request 50 GW continuous
  const powerNeeded = 50000000; // 50,000,000 kW = 50 GW
  const powerReceived = this.requestPower(grid, anchorId, powerNeeded);

  if (powerReceived >= powerNeeded) {
    // Full power - field stable
    anchor.totalActiveTime++;

    // Field operations...
    this.detectEntitiesInField(world, anchor, position);
    this.mortalizeGodsInField(world, anchor);
  } else if (powerReceived > powerNeeded * 0.5) {
    // Partial power (25-50 GW) - field unstable
    anchor.totalActiveTime++;
    anchor.isOverloading = true;
    anchor.overloadCountdown = anchor.overloadCountdown ?? 100;

    this.eventBus?.emit({
      type: 'reality_anchor:power_insufficient',
      source: anchorId,
      data: {
        needed: powerNeeded,
        received: powerReceived,
        stability: powerReceived / powerNeeded,
        message: `Reality Anchor struggling with only ${(powerReceived / 1000000).toFixed(0)} GW (need ${(powerNeeded / 1000000).toFixed(0)} GW)`,
      },
    });
  } else {
    // Insufficient power (<25 GW) - field collapse imminent
    this.initiateFieldCollapse(world, anchorId, anchor);
  }
}
```

#### 3. Power Consumer Integration

When a Reality Anchor is built, add PowerComponent:

```typescript
function buildRealityAnchor(entity: Entity): void {
  const anchor = createRealityAnchor();
  entity.addComponent(anchor);

  // Add power component (consumer role)
  const powerComponent: PowerComponent = {
    type: 'power',
    role: 'consumer',
    consumption: 50000000,          // 50 GW when field active
    powerType: 'stellar',           // Requires stellar-grade power
    isPowered: false,
    efficiency: 1.0,
  };
  entity.addComponent(powerComponent);

  // Reality Anchor has highest power priority in the grid
  // If power is insufficient, other consumers are shut off first
  // Only life support has equal priority
}
```

**Power Priority System:**
When grid power is insufficient, consumers are prioritized:
1. **Critical** (Reality Anchor, Life Support) - Last to lose power
2. **High** (Hospitals, Defense) - Protected when possible
3. **Normal** (Industry, Residential) - First to brown out
4. **Low** (Luxury, Entertainment) - Shut off immediately

**During Creator Battle:**
- All non-critical systems automatically shut down
- 100% of grid capacity dedicated to Reality Anchor
- Even 1% power loss can destabilize the field
- Backup batteries provide ~30 seconds of buffer time

---

## Progression Path

### Early Game
No power grid. All systems manual/primitive.

### Mid Game (Research: Basic Engineering)
1. **Windmills/Waterwheels**: 5-10 EP/tick
2. **Battery Banks**: Store 1000 EP
3. **Basic Grid**: Connect 1-3 generators
4. **Use Cases**: Lighting, basic machinery

### Late Game (Research: Advanced Engineering)
1. **Steam Engines**: 25 EP/tick
2. **Advanced Turbines**: 50 EP/tick
3. **Quantum Batteries**: 5000 EP capacity
4. **Complex Grids**: Multiple generators, priority management
5. **Use Cases**: Manufacturing, advanced research

### Endgame (Research: Clarke Tech)
1. **Fusion Reactors**: 200 EP/tick
2. **Zero-Point Taps**: 500 EP/tick (alien tech)
3. **Dimensional Cells**: 20,000 EP capacity
4. **Master Grid**: City-wide power distribution
5. **Critical Use Case**: **Reality Anchor** (50 EP/tick continuous)

---

## Implementation Checklist

### Phase 1: Core Components
- [ ] Create `PowerGeneratorComponent.ts`
- [ ] Create `PowerStorageComponent.ts`
- [ ] Create `PowerGridComponent.ts`
- [ ] Create `PowerConsumerComponent.ts`
- [ ] Add component types to `ComponentType` enum
- [ ] Export from `components/index.ts`

### Phase 2: Power Grid System
- [ ] Create `PowerGridSystem.ts`
- [ ] Implement generation calculation
- [ ] Implement consumption tracking
- [ ] Implement battery charging/discharging
- [ ] Implement priority-based distribution
- [ ] Implement brownout/blackout handling
- [ ] Register system

### Phase 3: Generator Types
- [ ] Create generator buildings (windmill, waterwheel, etc.)
- [ ] Implement fuel consumption for fuel-based generators
- [ ] Implement weather effects on renewable generators
- [ ] Add generator maintenance requirements

### Phase 4: Storage Types
- [ ] Create battery building types
- [ ] Implement charge/discharge mechanics
- [ ] Implement capacity degradation over time
- [ ] Add storage upgrade paths

### Phase 5: Reality Anchor Integration
- [ ] Update `RealityAnchorSystem.ts` line 80 (charging)
- [ ] Update `RealityAnchorSystem.ts` line 119 (active field)
- [ ] Add `PowerConsumerComponent` to reality anchor creation
- [ ] Implement field collapse on power loss
- [ ] Add power shortage emergency events
- [ ] Test full tech path progression

### Phase 6: UI & Visualization
- [ ] Power grid dashboard view
- [ ] Generator status panels
- [ ] Power consumption graphs
- [ ] Battery charge indicators
- [ ] Brownout warnings
- [ ] Reality anchor power status

---

## Events

```typescript
// Power Grid Events
'power:blackout'              // Grid lost all power
'power:brownout'              // Insufficient power, rationing active
'power:restored'              // Power fully restored
'power:generator_online'      // Generator started
'power:generator_offline'     // Generator stopped
'power:battery_full'          // Storage at capacity
'power:battery_depleted'      // Storage empty
'power:overload_risk'         // Grid near capacity

// Reality Anchor Power Events
'reality_anchor:power_loss'           // Lost grid connection
'reality_anchor:power_insufficient'   // Not enough power, field unstable
'reality_anchor:charging_interrupted' // Charging stopped due to power loss
'reality_anchor:field_collapse'       // Field collapsed from power failure
```

---

## Design Principles

1. **No Magic**: Power is a hard resource constraint, especially for reality anchors
2. **Progressive Unlock**: Players must research and build infrastructure
3. **Strategic Trade-offs**: Running reality anchor means huge power commitment
4. **Failure Consequences**: Power loss during god battle = gods regain divinity
5. **Tech Path Identity**: Mastering power grid is core to tech rebellion success

---

## Notes

### Critical Role in Cosmic Rebellion

The Reality Anchor is the **primary driver** for endgame power requirements. To kill a god, you need stellar-scale energy.

**Minimum Infrastructure for Creator Battle:**
- **1,000 Solar Satellites in Orbit** = 100 GW output
  - Provides 2× safety margin (50 GW needed)
  - Allows for 50% satellite loss during battle without field collapse
  - Construction time: ~14 hours automated (1,000 satellites × 50 sec each)
  - Launch time: ~8 hours (1,000 launches × 30 sec cooldown)
  - **Total prep time: ~1 day** (assuming factory automation is set up)

**OR (risky alternatives):**
- **500× Zero-Point Extractors** = 50 GW (no safety margin)
  - High vacuum decay risk (500× 1% per hour = eventual universe destruction)
  - No backup if any fail
  - Not recommended for god battle

**Backup Power:**
- **Supercapacitor Banks**: Store 50 GW-seconds
  - Provides 30 seconds of buffer if Stellar Relay fails
  - Enough time to re-align beam or activate emergency protocol
  - Insufficient for extended battle (need minutes, not seconds)

**What Happens if Power Fails:**
1. **100% → 75% power**: Field weakens, gods regain partial divinity
2. **75% → 50% power**: Field unstable, reality ripples, gods healing
3. **50% → 25% power**: Field collapsing, countdown to failure
4. **Below 25% power**: Field collapse, gods restored to full power
5. **Battle outcome**: "Rebellion Crushed" - Creator's wrath is terrible

### Rebellion Outcome Impact

Power grid stability directly affects rebellion outcomes (DIVINE_PROGRESSION_SPEC.md):
- **Stable Grid (100% power)** → Total Victory, Creator Escape, or Pyrrhic Victory
- **Unstable Grid (50-100% power)** → Negotiated Truce or Stalemate
- **Grid Failure (<50% power)** → Rebellion Crushed (Creator restored, rebels annihilated)
- **Stellar Relay Misfire** → Pyrrhic Victory (beam vaporizes city during battle)

**The difference between "Total Victory" and "Rebellion Crushed" is stellar engineering.**

### Narrative Stakes

Building a Dyson Swarm is the tech path equivalent of organizing a divine coalition. Both are weeks-long preparation for the final battle:

- **Magic Path**: Gather believer armies, unify rebellious deities, discover Creator's weakness through lore
- **Tech Path**: Automate satellite production, launch orbital infrastructure, construct Reality Anchor

Both paths require:
- Strategic planning (~1-2 weeks in-game time)
- Massive resource investment (exotic matter, quantum processors)
- High risk of Creator discovering your plans
- Spectacular failure if power/belief insufficient during battle

**Tech path advantages**:
- **Incremental progress**: Start with 50 satellites, add more as you go
- **Guaranteed power**: Once satellites are in orbit, power is stable (unlike fickle belief)
- **Observable progress**: Watch your swarm grow, see power output increase
- **Automation**: Factory builds satellites while you work on other prep

**Tech path disadvantages**:
- **Visible from space**: Each satellite launch is a beacon. Creator KNOWS you're building something
- **Vulnerable to attack**: Stellar flares, divine intervention, or sabotage can destroy satellites
- **Time-sensitive**: Creator may attack before you launch enough satellites
- **Launch failures**: Mass driver malfunctions destroy expensive satellites

**Creator's Response Options:**
- **Ignore it** (hubris - "mortals can't threaten me")
- **Divine intervention** to destroy Mass Driver mid-construction
- **Stellar flare** to damage launched satellites
- **Attack early** before swarm reaches critical mass
- **Corrupted AI** sabotages satellite factory automation

---

**Version History:**
- v2.1 (2026-01-01): **DYSON SWARM** - Changed from Dyson Sphere to Dyson Swarm
  - Build-and-launch gameplay: Solar Satellite Factory → Mass Driver → Orbital Swarm
  - Incremental power scaling (100 MW per satellite)
  - Minimum 500 satellites for Reality Anchor (50 GW), 1,000 for safety margin (100 GW)
  - Construction time reduced from ~2 months to ~1 day
  - Added Mass Driver for satellite launches
  - More realistic (Dyson swarms are feasible, full spheres are not)
  - Better gameplay: active launching vs passive waiting for completion percentage
- v2.0 (2026-01-01): **UNIFIED SPEC** - Merged with AUTOMATION_LOGISTICS_SPEC.md
  - Changed from EP/tick to kW units (aligns with automation spec)
  - Reality Anchor power increased from 50 EP/tick to 50 GW (50,000,000 kW)
  - Added Tier 8: God-Killing Tech (Stellar Engineering)
  - Added Dyson Sphere and Stellar Relay components (changed to swarm in v2.1)
  - Positioned Reality Anchor as Clarke Tech consumer requiring stellar power
  - Updated all code examples to use PowerComponent from automation spec
  - Cross-referenced with DIVINE_PROGRESSION_SPEC.md Phase 4 (Cosmic Rebellion)
- v1.0 (2026-01-01): Initial specification with Reality Anchor integration (superseded)
