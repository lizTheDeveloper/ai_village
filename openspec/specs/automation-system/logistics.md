> **System:** automation-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Automation & Logistics System Specification

> *Dedicated to the engineers of Factorio, whose elegant factory systems taught us that the joy isn't in moving items manually—it's in watching robots do it for you.*

## Overview

This specification defines the architecture for Factorio-inspired automation in AI Village:

1. **Streamlined Belt Logistics** - Simple conveyors with direct machine connections (avoiding spaghetti)
2. **Tiered Power Systems** - Mechanical → Electrical → Arcane power progression
3. **Production Automation** - Machines that craft recipes autonomously
4. **Robot-Based Logistics** - Quick progression to flying logistics robots (Tier 4)
5. **Arcane Endgame** - Teleportation and matter transmutation (Tier 5)
6. **Agent-as-Engineer** - Agents configure and optimize, machines execute

**Design Goal:** Compress the belt-spaghetti phase. Make belts cheap and simple, enable direct machine connections, then rush to robot logistics by Tier 4.

---

## Part 1: Design Philosophy

### Core Principles

From the user's requirements:

1. **"Get to robots quickly"** - Robot logistics should be Tier 4, not endgame
2. **"Avoid spaghetti"** - Direct machine connections, simple belt routing
3. **"Belts should be cheap"** - Early belt automation is accessible but basic
4. **"Lots of tech trees"** - Keep automation tree compressed (3 sub-fields, quick progression)
5. **"Agents as engineers"** - Once built, automation runs independently

### Integration with Existing Systems

**Research System** (`packages/core/src/research/`):
- New research fields: `logistics`, `production`, `robotics`
- Research unlocks buildings, recipes, and abilities
- Follows existing `ResearchDefinition` structure

**Building System** (`packages/core/src/buildings/`, `packages/core/src/systems/BuildingSystem.ts`):
- Automation buildings extend `BuildingBlueprint`
- Functionality types: `power_generation`, `power_consumption`, `crafting`, `logistics`

**Crafting System** (`packages/core/src/crafting/CraftingSystem.ts`):
- Machines reference existing `Recipe` definitions
- Auto-crafting uses same ingredient/output model

**Item System** (`packages/core/src/items/`):
- Uses `defineItem` helper for automation items
- Items include: belts, inserters, robots, power components

---

## Part 2: Power Grid System

### Power Component

```typescript
/**
 * Power producer/consumer component
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
  | 'arcane';      // Mana/ley line powered (Tier 5)
```

### Power Grid Network

```typescript
/**
 * Power network - connects producers and consumers
 * Similar to Factorio's electrical network
 */
interface PowerNetwork {
  id: string;
  powerType: PowerType;

  /** All entities in this network */
  members: Set<EntityId>;

  /** Total generation capacity (kW) */
  totalGeneration: number;

  /** Total consumption (kW) */
  totalConsumption: number;

  /** Power availability ratio (0-1) */
  availability: number;

  /** Connection graph (for pathfinding power poles) */
  connections: Map<EntityId, Set<EntityId>>;
}

/**
 * PowerGridSystem - Manages power networks
 * Runs after BuildingSystem, before automation systems
 */
class PowerGridSystem implements System {
  public readonly id: SystemId = 'power_grid';
  public readonly priority: number = 52;  // After BuildingSystem (50)
  public readonly requiredComponents = [] as const;

  private networks: Map<string, PowerNetwork> = new Map();

  /**
   * Update all power networks
   */
  update(world: World, _entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // 1. Rebuild networks (handles new/destroyed power poles)
    this.rebuildNetworks(world);

    // 2. Calculate power balance for each network
    for (const network of this.networks.values()) {
      this.updateNetworkPower(network, world, deltaTime);
    }

    // 3. Apply power availability to consumers
    this.applyPowerAvailability(world);
  }

  /**
   * Rebuild power networks from scratch each tick
   * (Power grids change as poles are built/destroyed)
   */
  private rebuildNetworks(world: World): void {
    this.networks.clear();

    const powerEntities = world.query()
      .with(CT.Power)
      .with(CT.Position)
      .executeEntities();

    // Group into networks by connectivity
    const visited = new Set<EntityId>();

    for (const entity of powerEntities) {
      if (visited.has(entity.id)) continue;

      const power = (entity as EntityImpl).getComponent<PowerComponent>(CT.Power);
      const network = this.buildNetwork(entity, world, visited);

      this.networks.set(network.id, network);
    }
  }

  /**
   * Build a connected power network via graph traversal
   */
  private buildNetwork(
    startEntity: Entity,
    world: World,
    visited: Set<EntityId>
  ): PowerNetwork {
    const power = (startEntity as EntityImpl).getComponent<PowerComponent>(CT.Power);

    const network: PowerNetwork = {
      id: crypto.randomUUID(),
      powerType: power!.powerType,
      members: new Set(),
      totalGeneration: 0,
      totalConsumption: 0,
      availability: 1.0,
      connections: new Map(),
    };

    // BFS to find all connected entities
    const queue = [startEntity];

    while (queue.length > 0) {
      const entity = queue.shift()!;
      if (visited.has(entity.id)) continue;
      visited.add(entity.id);

      network.members.add(entity.id);

      // Find connected neighbors (power poles within range)
      const neighbors = this.findConnectedNeighbors(entity, world);
      network.connections.set(entity.id, new Set(neighbors.map(e => e.id)));

      queue.push(...neighbors.filter(n => !visited.has(n.id)));
    }

    return network;
  }

  /**
   * Find entities connected to this one (power pole range)
   */
  private findConnectedNeighbors(entity: Entity, world: World): Entity[] {
    const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);
    const building = (entity as EntityImpl).getComponent<BuildingComponent>(CT.Building);

    if (!pos || !building) return [];

    // Get connection range from building blueprint
    const blueprint = world.buildingRegistry.tryGet(building.buildingType);
    if (!blueprint) return [];

    const powerFunc = blueprint.functionality.find(f => f.type === 'power_pole') as
      | { type: 'power_pole'; range: number }
      | undefined;

    if (!powerFunc) return [];

    // Find all power entities within range
    const allPowerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();

    return allPowerEntities.filter(other => {
      if (other.id === entity.id) return false;

      const otherPos = (other as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (!otherPos) return false;

      const dx = pos.x - otherPos.x;
      const dy = pos.y - otherPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      return dist <= powerFunc.range;
    });
  }

  /**
   * Update power generation/consumption for a network
   */
  private updateNetworkPower(
    network: PowerNetwork,
    world: World,
    deltaTime: number
  ): void {
    network.totalGeneration = 0;
    network.totalConsumption = 0;

    for (const memberId of network.members) {
      const entity = world.getEntity(memberId);
      if (!entity) continue;

      const power = (entity as EntityImpl).getComponent<PowerComponent>(CT.Power);
      if (!power) continue;

      if (power.role === 'producer' && power.generation) {
        network.totalGeneration += power.generation * power.efficiency;
      }

      if (power.role === 'consumer' && power.consumption) {
        network.totalConsumption += power.consumption;
      }
    }

    // Calculate availability (what % of power demand is met)
    if (network.totalConsumption > 0) {
      const ratio = network.totalGeneration / network.totalConsumption;
      // Explicit cap at 100% (excess generation doesn't increase availability past 100%)
      network.availability = (ratio > 1.0) ? 1.0 : ratio;
    } else {
      network.availability = 1.0;  // No consumers = 100% availability
    }
  }

  /**
   * Apply power availability to consumer efficiency
   */
  private applyPowerAvailability(world: World): void {
    for (const network of this.networks.values()) {
      for (const memberId of network.members) {
        const entity = world.getEntity(memberId);
        if (!entity) continue;

        const power = (entity as EntityImpl).getComponent<PowerComponent>(CT.Power);
        if (!power || power.role !== 'consumer') continue;

        // Consumers run at reduced efficiency if power is low
        power.isPowered = network.availability > 0.1;  // Threshold
        power.efficiency = network.availability;
      }
    }
  }
}
```

### Mechanical Power (Tier 2)

```typescript
// Windmill - generates power inconsistently (affected by wind)
const WINDMILL_BLUEPRINT = defineBuildingBlueprint({
  id: 'windmill',
  name: 'Windmill',
  cost: [
    { itemId: 'wood', amount: 30 },
    { itemId: 'stone', amount: 15 },
    { itemId: 'fiber', amount: 10 },
  ],
  buildTime: 120,
  functionality: [
    {
      type: 'power_generation',
      powerType: 'mechanical',
      baseGeneration: 50,  // 50 kW
      variability: 0.3,    // ±30% based on weather
      range: 5,            // Powers machines within 5 tiles
    },
  ],
  requiredResearch: 'machinery_i',
});

// Water Wheel - consistent power if near water
const WATER_WHEEL_BLUEPRINT = defineBuildingBlueprint({
  id: 'water_wheel',
  name: 'Water Wheel',
  cost: [
    { itemId: 'wood', amount: 25 },
    { itemId: 'stone', amount: 20 },
  ],
  buildTime: 100,
  functionality: [
    {
      type: 'power_generation',
      powerType: 'mechanical',
      baseGeneration: 75,  // More reliable than windmill
      requiresWater: true,
      range: 5,
    },
  ],
  requiredResearch: 'machinery_i',
});
```

### Electrical Power (Tier 3-4)

```typescript
// Coal Generator
const COAL_GENERATOR = defineBuildingBlueprint({
  id: 'coal_generator',
  name: 'Coal Generator',
  cost: [
    { itemId: 'iron_ingot', amount: 20 },
    { itemId: 'copper_ingot', amount: 15 },
    { itemId: 'stone', amount: 10 },
  ],
  buildTime: 150,
  functionality: [
    {
      type: 'power_generation',
      powerType: 'electrical',
      baseGeneration: 150,  // 150 kW
      fuelType: 'coal',
      fuelConsumption: 1,   // 1 coal per 60 ticks
    },
  ],
  requiredResearch: 'production_ii',
});

// Power Pole
const POWER_POLE = defineBuildingBlueprint({
  id: 'power_pole',
  name: 'Power Pole',
  cost: [
    { itemId: 'wood', amount: 5 },
    { itemId: 'copper_wire', amount: 3 },
  ],
  buildTime: 20,
  functionality: [
    {
      type: 'power_pole',
      range: 10,  // Connects to poles/buildings within 10 tiles
    },
  ],
  requiredResearch: 'logistics_ii',
});
```

---

## Part 2.5: Magic System Integration

### Arcane Power Generation

Arcane power represents the fusion of magic and machinery—the Tier 5 endgame where automation transcends physical limitations.

```typescript
/**
 * Arcane power source - generates from ley lines or mana
 */
interface ArcanePowerSource {
  /** Power type identifier */
  type: 'ley_generator' | 'mana_condenser' | 'runic_battery';

  /** Which magic paradigm powers this */
  paradigmId: string;

  /** Mana consumption rate (for mana-based systems) */
  manaPerTick?: number;

  /** Ley line proximity required (for ley generators) */
  leyLineDistance?: number;

  /** Current power generation */
  generation: number;

  /** Is this paradigm currently enabled? */
  paradigmEnabled: boolean;
}

/**
 * Integration with MagicSystemStateManager
 */
function updateArcanePowerGeneration(
  source: ArcanePowerSource,
  world: World
): void {
  const magicState = getMagicSystemState();

  // Check if paradigm is enabled in this universe
  source.paradigmEnabled = magicState.isEnabled(source.paradigmId);

  if (!source.paradigmEnabled) {
    source.generation = 0;
    return;
  }

  if (source.type === 'ley_generator') {
    // Ley generators work if on a ley line
    const nearLeyLine = world.leyLineSystem.checkProximity(
      source.position,
      source.leyLineDistance ?? 5
    );

    source.generation = nearLeyLine ? 1000 : 0; // 1000 kW infinite power
  }

  if (source.type === 'mana_condenser') {
    // Mana condensers consume agent mana pools
    const nearbyMages = world.query()
      .with(CT.MagicUser)
      .with(CT.Position)
      .executeEntities()
      .filter(e => {
        const pos = e.getComponent<PositionComponent>(CT.Position);
        return getDistance(pos, source.position) <= 10;
      });

    let totalManaAvailable = 0;
    for (const mage of nearbyMages) {
      const magicUser = mage.getComponent<MagicUserComponent>(CT.MagicUser);
      totalManaAvailable += magicUser.currentMana;
    }

    // Generate 10 kW per mana consumed
    // Explicit bounded allocation: consume what's requested OR what's available, whichever is smaller
    const requested = source.manaPerTick ?? 1;
    const manaToConsume = (totalManaAvailable >= requested) ? requested : totalManaAvailable;

    source.generation = manaToConsume * 10;

    // Actually consume mana from nearby mages
    let remaining = manaToConsume;
    for (const mage of nearbyMages) {
      if (remaining <= 0) break;

      const magicUser = mage.getComponent<MagicUserComponent>(CT.MagicUser);
      // Allocate from this mage: take what we need OR what they have, whichever is smaller
      const consumed = (magicUser.currentMana >= remaining) ? remaining : magicUser.currentMana;
      magicUser.currentMana -= consumed;
      remaining -= consumed;
    }
  }
}
```

### Magical Machine Enhancements

Machines can be enchanted or enhanced with magical properties:

```typescript
/**
 * Magical enhancement component for automation buildings
 */
interface MagicEnhancementComponent extends Component {
  readonly type: 'magic_enhancement';

  /** Which paradigm this enhancement uses */
  paradigmId: string;

  /** Enhancement type */
  enhancementType: MachineEnhancement;

  /** Strength of enhancement (0-1) */
  magnitude: number;

  /** Mana upkeep per tick */
  manaUpkeep: number;

  /** Is the enhancement currently active? */
  active: boolean;
}

type MachineEnhancement =
  | 'speed_blessing'      // Machine crafts faster
  | 'efficiency_rune'     // Uses less power
  | 'quality_charm'       // Better output quality
  | 'durability_ward'     // Never breaks down
  | 'auto_repair'         // Self-healing
  | 'dimensional_storage' // Infinite input buffers
  | 'transmutation'       // Can transform materials
  | 'temporal_acceleration'; // Time flows differently

/**
 * Example: Academic paradigm enchantment on assembly machine
 */
const ENCHANTED_ASSEMBLY_MACHINE = defineBuildingBlueprint({
  id: 'enchanted_assembler',
  name: 'Enchanted Assembly Machine',
  description: 'Assembly machine enhanced with Academic runes for speed.',
  cost: [
    { itemId: 'assembly_machine_i', amount: 1 },
    { itemId: 'runic_inscription', amount: 5 },
    { itemId: 'mana_crystal', amount: 3 },
  ],
  buildTime: 200,
  functionality: [
    {
      type: 'assembly_machine',
      speed: 2.5,  // 2.5x faster due to enchantment
      ingredientSlots: 4,
      moduleSlots: 2,
    },
    {
      type: 'magic_enhancement',
      paradigmId: 'academic',
      enhancementType: 'speed_blessing',
      magnitude: 0.5,  // +50% speed
      manaUpkeep: 0.1,  // Costs 0.1 mana/tick
    },
  ],
  requiredResearch: 'production_iv',
});
```

### Matter Transmutation Integration

Matter transmutation uses the existing spell effect system:

```typescript
/**
 * Matter Transmuter building - converts items using magic
 */
interface MatterTransmuterComponent extends Component {
  readonly type: 'matter_transmuter';

  /** Current transmutation recipe */
  currentRecipe?: TransmutationRecipe;

  /** Progress (0-100) */
  progress: number;

  /** Which paradigm enables transmutation */
  paradigmId: string;

  /** Mana cost per transmutation */
  manaCost: number;
}

interface TransmutationRecipe {
  id: string;
  name: string;

  /** Input item */
  input: { itemId: string; amount: number };

  /** Output item */
  output: { itemId: string; amount: number };

  /** Mana cost */
  manaCost: number;

  /** Required magic paradigm */
  paradigmId: string;

  /** Crafting time */
  transmutationTime: number;
}

// Example transmutation recipes
const TRANSMUTATION_RECIPES: TransmutationRecipe[] = [
  {
    id: 'stone_to_iron',
    name: 'Stone to Iron',
    input: { itemId: 'stone', amount: 10 },
    output: { itemId: 'iron_ore', amount: 1 },
    manaCost: 50,
    paradigmId: 'academic',
    transmutationTime: 60,
  },
  {
    id: 'wood_to_coal',
    name: 'Wood to Coal',
    input: { itemId: 'wood', amount: 5 },
    output: { itemId: 'coal', amount: 1 },
    manaCost: 20,
    paradigmId: 'academic',
    transmutationTime: 30,
  },
  {
    id: 'iron_to_gold',
    name: 'Iron to Gold (Expensive!)',
    input: { itemId: 'iron_ingot', amount: 10 },
    output: { itemId: 'gold_ingot', amount: 1 },
    manaCost: 500,
    paradigmId: 'academic',
    transmutationTime: 300,
  },
];
```

### Teleportation Network

Teleportation pads use dimensional magic paradigms:

```typescript
/**
 * Teleportation pad - instant item transfer
 */
interface TeleportPadComponent extends Component {
  readonly type: 'teleport_pad';

  /** Network ID this pad belongs to */
  networkId: string;

  /** Linked pad ID (for point-to-point) */
  linkedPadId?: string;

  /** Items waiting to teleport */
  sendBuffer: ItemInstance[];

  /** Mana cost per item teleported */
  manaCostPerItem: number;

  /** Required paradigm */
  paradigmId: 'dimensional';

  /** Maximum teleport range (tiles, 0 = unlimited) */
  range: number;
}

/**
 * TeleportationSystem - handles instant item transfer
 */
class TeleportationSystem implements System {
  public readonly id: SystemId = 'teleportation';
  public readonly priority: number = 56;

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const magicState = getMagicSystemState();

    // Teleportation only works if dimensional paradigm is enabled
    if (!magicState.isEnabled('dimensional')) {
      return;
    }

    for (const entity of entities) {
      const pad = entity.getComponent<TeleportPadComponent>(CT.TeleportPad);
      const connection = entity.getComponent<MachineConnectionComponent>(CT.MachineConnection);

      if (!pad || !connection) continue;

      // Find linked destination
      const destination = world.getEntity(pad.linkedPadId ?? '');
      if (!destination) continue;

      const destPad = destination.getComponent<TeleportPadComponent>(CT.TeleportPad);
      const destConnection = destination.getComponent<MachineConnectionComponent>(CT.MachineConnection);

      if (!destPad || !destConnection) continue;

      // Try to teleport items from send buffer
      for (const item of pad.sendBuffer) {
        // Check if we have enough mana
        const manaAvailable = this.getNearbyMana(entity, world);

        if (manaAvailable < pad.manaCostPerItem) {
          continue; // Not enough mana
        }

        // Consume mana
        this.consumeMana(entity, world, pad.manaCostPerItem);

        // Teleport item instantly
        destConnection.outputs[0].items.push(item);

        // Remove from send buffer
        pad.sendBuffer = pad.sendBuffer.filter(i => i.instanceId !== item.instanceId);

        // Create visual effect
        world.eventBus.emit({
          type: 'teleportation:item_teleported',
          source: entity.id,
          target: destination.id,
          data: { itemId: item.definitionId },
        });
      }
    }
  }

  private getNearbyMana(entity: Entity, world: World): number {
    // Similar to mana condenser - check nearby mages
    const pos = entity.getComponent<PositionComponent>(CT.Position);
    const nearbyMages = world.query()
      .with(CT.MagicUser)
      .with(CT.Position)
      .executeEntities()
      .filter(e => {
        const magePos = e.getComponent<PositionComponent>(CT.Position);
        return getDistance(pos, magePos) <= 10;
      });

    let totalMana = 0;
    for (const mage of nearbyMages) {
      const magicUser = mage.getComponent<MagicUserComponent>(CT.MagicUser);
      totalMana += magicUser.currentMana;
    }

    return totalMana;
  }

  private consumeMana(entity: Entity, world: World, amount: number): void {
    const pos = entity.getComponent<PositionComponent>(CT.Position);
    const nearbyMages = world.query()
      .with(CT.MagicUser)
      .with(CT.Position)
      .executeEntities()
      .filter(e => {
        const magePos = e.getComponent<PositionComponent>(CT.Position);
        return getDistance(pos, magePos) <= 10;
      });

    let remaining = amount;
    for (const mage of nearbyMages) {
      if (remaining <= 0) break;

      const magicUser = mage.getComponent<MagicUserComponent>(CT.MagicUser);
      // Allocate from this mage: take what we need OR what they have, whichever is smaller
      const consumed = (magicUser.currentMana >= remaining) ? remaining : magicUser.currentMana;
      magicUser.currentMana -= consumed;
      remaining -= consumed;
    }
  }
}
```

---

## Part 2.6: Divinity System Integration

### Divine Blessings on Factories

Gods can bless automation infrastructure to improve efficiency, granting divine favor to industrious settlements.

```typescript
/**
 * Divine blessing component for buildings
 */
interface DivineBlessingComponent extends Component {
  readonly type: 'divine_blessing';

  /** Deity granting the blessing */
  deityId: string;

  /** Type of blessing */
  blessingType: FactoryBlessingType;

  /** Magnitude (0-1, affects strength) */
  magnitude: number;

  /** When blessing expires (game tick, -1 = permanent) */
  expiresAt: number;

  /** Belief cost per game hour */
  maintenanceCost: number;

  /** Is blessing currently active? */
  active: boolean;
}

type FactoryBlessingType =
  | 'productivity'    // +X% output
  | 'efficiency'      // -X% power consumption
  | 'speed'           // +X% crafting speed
  | 'quality'         // Better item quality
  | 'reliability'     // Never breaks down
  | 'abundance'       // Chance of extra output
  | 'protection'      // Immune to disasters
  | 'enlightenment';  // Workers learn faster

/**
 * DivineAutomationSystem - applies divine blessings to machines
 */
class DivineAutomationSystem implements System {
  public readonly id: SystemId = 'divine_automation';
  public readonly priority: number = 51;  // Before automation systems

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const blessing = entity.getComponent<DivineBlessingComponent>(CT.DivineBlessing);
      const assembly = entity.getComponent<AssemblyMachineComponent>(CT.AssemblyMachine);
      const power = entity.getComponent<PowerComponent>(CT.Power);

      if (!blessing || !assembly) continue;

      // Check if blessing is still valid
      if (blessing.expiresAt !== -1 && world.tick >= blessing.expiresAt) {
        blessing.active = false;
        continue;
      }

      // Get deity and check belief
      const deity = world.deityRegistry.get(blessing.deityId);
      if (!deity) {
        blessing.active = false;
        continue;
      }

      // Deduct maintenance cost
      const hoursPassed = _deltaTime / TICKS_PER_HOUR;
      const cost = blessing.maintenanceCost * hoursPassed;

      if (deity.belief >= cost) {
        deity.belief -= cost;
        blessing.active = true;
      } else {
        blessing.active = false;
        continue;
      }

      // Apply blessing effects
      switch (blessing.blessingType) {
        case 'speed':
          assembly.speed *= (1 + blessing.magnitude); // e.g., +30% = 1.3x
          break;

        case 'efficiency':
          if (power) {
            power.consumption *= (1 - blessing.magnitude); // e.g., -20% = 0.8x
          }
          break;

        case 'productivity':
          // Implemented in AssemblyMachineSystem - chance of extra output
          break;

        case 'quality':
          // Implemented in crafting quality calculation
          break;

        case 'reliability':
          // Machine never breaks, no repair needed
          break;
      }
    }
  }
}

/**
 * Integration with DivinePowerTypes
 */
const FACTORY_BLESSING_POWER: DivinePower = {
  type: 'bless_factory',
  name: 'Bless Factory',
  description: 'Grant divine favor to an automated production facility',
  category: 'blessing',
  requiredTier: 'moderate',
  baseCost: 100,
  nativeDomains: ['harvest', 'protection', 'order'],
  offDomainMultiplier: 1.5,
  createsIdentityRisk: false,
  targetType: 'object',
  range: 0,  // Unlimited
  duration: 24,  // 24 game hours
  cooldown: 0,
  requiresAvatar: false,
  visibility: 'subtle',
  mythogenic: false,
  suggestedTraits: ['industrious', 'orderly', 'benevolent'],
};
```

### Prayer-Powered Machines

Machines can be configured to accept prayers as a power source, converting belief into mechanical energy:

```typescript
/**
 * Prayer power component - converts prayers to power
 */
interface PrayerPowerComponent extends Component {
  readonly type: 'prayer_power';

  /** Which deity this shrine is dedicated to */
  deityId: string;

  /** Accumulated prayer power (belief points) */
  accumulatedPrayer: number;

  /** Conversion rate: belief → kW */
  conversionRate: number;

  /** Current power output */
  generation: number;

  /** Prayers received in last hour */
  recentPrayers: Prayer[];
}

/**
 * Shrine building - prayer-powered generator
 */
const PRAYER_SHRINE = defineBuildingBlueprint({
  id: 'prayer_shrine',
  name: 'Prayer Shrine',
  description: 'Converts prayers to divine power that can fuel machines.',
  cost: [
    { itemId: 'stone', amount: 50 },
    { itemId: 'gold_ingot', amount: 5 },
    { itemId: 'sacred_oil', amount: 3 },
  ],
  buildTime: 180,
  functionality: [
    {
      type: 'power_generation',
      powerType: 'arcane',
      baseGeneration: 0,  // Depends on prayer
    },
    {
      type: 'prayer_power',
      conversionRate: 10,  // 1 belief = 10 kW
    },
  ],
  requiredResearch: 'divine_engineering',
});

/**
 * PrayerPowerSystem - converts prayers to electricity
 */
class PrayerPowerSystem implements System {
  public readonly id: SystemId = 'prayer_power';
  public readonly priority: number = 51;

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const prayerPower = entity.getComponent<PrayerPowerComponent>(CT.PrayerPower);
      const power = entity.getComponent<PowerComponent>(CT.Power);

      if (!prayerPower || !power) continue;

      // Check for new prayers to this deity
      const deity = world.deityRegistry.get(prayerPower.deityId);
      if (!deity) continue;

      // Get prayers from last hour
      const oneHourAgo = world.tick - TICKS_PER_HOUR;
      const recentPrayers = deity.prayers.filter(p => p.timestamp >= oneHourAgo);

      // Calculate total belief from prayers
      let beliefFromPrayers = 0;
      for (const prayer of recentPrayers) {
        beliefFromPrayers += prayer.beliefGenerated;
      }

      prayerPower.accumulatedPrayer = beliefFromPrayers;

      // Convert to power generation
      prayerPower.generation = prayerPower.accumulatedPrayer * prayerPower.conversionRate;
      power.generation = prayerPower.generation;

      // Store recent prayers
      prayerPower.recentPrayers = recentPrayers;
    }
  }
}
```

### Divine Favor Efficiency Bonuses

Settlement-wide divine favor affects all automation:

```typescript
/**
 * Divine favor modifier for automation
 */
interface DivineFavorModifier {
  /** Which deity is providing favor */
  deityId: string;

  /** Favor level (0-100) */
  favor: number;

  /** Automation efficiency bonus (0-1) */
  efficiencyBonus: number;

  /** Does this deity's domain align with industry? */
  domainAlignment: number;
}

/**
 * Calculate divine favor bonuses for a settlement
 */
function calculateDivineFavorBonus(world: World, settlementId: string): number {
  const settlement = world.getEntity(settlementId);
  const settlementComponent = settlement?.getComponent<SettlementComponent>(CT.Settlement);

  if (!settlementComponent) return 1.0;

  let totalBonus = 0;

  // Check each deity worshipped in settlement
  for (const deityId of settlementComponent.worshippedDeities) {
    const deity = world.deityRegistry.get(deityId);
    if (!deity) continue;

    // Calculate favor level
    const followers = world.query()
      .with(CT.Agent)
      .with(CT.Belief)
      .executeEntities()
      .filter(e => {
        const belief = e.getComponent<BeliefComponent>(CT.Belief);
        return belief.primaryDeity === deityId;
      });

    // Calculate favor: 10 per follower, capped at 100 (max 10 followers counted)
    const rawFavor = followers.length * 10;
    const favor = (rawFavor > 100) ? 100 : rawFavor;

    // Check domain alignment
    let domainBonus = 0;
    if (deity.domain === 'order' || deity.domain === 'protection') {
      domainBonus = 0.2; // +20% for order/protection gods
    } else if (deity.domain === 'harvest') {
      domainBonus = 0.1; // +10% for harvest gods
    }

    // Calculate efficiency bonus
    const efficiencyBonus = (favor / 100) * domainBonus;
    totalBonus += efficiencyBonus;
  }

  return 1.0 + totalBonus; // e.g., 1.3 = +30% efficiency
}

/**
 * Apply divine favor to machines
 */
function applyDivineFavorToMachine(
  machine: AssemblyMachineComponent,
  world: World,
  settlementId: string
): void {
  const favorBonus = calculateDivineFavorBonus(world, settlementId);
  machine.speed *= favorBonus;
}
```

### Divine Disasters and Curses

Gods can also curse automation, causing breakdowns or inefficiencies:

```typescript
/**
 * Divine curse on factory
 */
interface DivineCurseComponent extends Component {
  readonly type: 'divine_curse';

  /** Deity who cursed this */
  deityId: string;

  /** Curse type */
  curseType: FactoryCurseType;

  /** Magnitude (0-1) */
  magnitude: number;

  /** When curse expires */
  expiresAt: number;

  /** Lift condition */
  liftCondition?: CurseLiftCondition;
}

type FactoryCurseType =
  | 'breakdown'       // Frequent malfunctions
  | 'inefficiency'    // Higher power consumption
  | 'slowness'        // Slower production
  | 'waste'           // Lost materials
  | 'corruption'      // Output items are damaged
  | 'haunting'        // Workers avoid the building
  | 'plague'          // Spreads to nearby machines
  | 'dimensional_rift'; // Items disappear into void

/**
 * Example divine power: Curse Factory
 */
const CURSE_FACTORY_POWER: DivinePower = {
  type: 'curse_factory',
  name: 'Curse Factory',
  description: 'Inflict divine wrath upon automated production, causing breakdowns and inefficiency',
  category: 'curse',
  requiredTier: 'moderate',
  baseCost: 150,
  nativeDomains: ['chaos', 'trickery', 'storm'],
  offDomainMultiplier: 1.5,
  createsIdentityRisk: true,
  targetType: 'object',
  range: 0,
  duration: 48,  // 48 game hours
  cooldown: 24,
  requiresAvatar: false,
  visibility: 'clear',
  mythogenic: true,
  suggestedTraits: ['wrathful', 'vengeful', 'destructive'],
};
```

---

## Part 2.7: Clarke Tech - Post-Scarcity & Multiversal Systems

> *"Any sufficiently advanced technology is indistinguishable from magic."* - Arthur C. Clarke

Clarke Tech represents the ultimate evolution of automation: technology so advanced it defies conventional physics and enables universe-bridging capabilities.

### Progression Overview

**Tier 5: Arcane** (Magic-Tech Fusion)
- Ley generators, teleportation, transmutation
- Magic paradigms power machines

**Tier 6: Post-Scarcity** (Molecular Manufacturing)
- Matter compilers, antimatter reactors, self-replicating machines
- Resources become effectively infinite

**Tier 7: Exotic Physics** (Reality Manipulation)
- Zero-point energy, gravity manipulation, wormhole stabilizers
- Local physics can be altered

**Tier 8: Multiversal** (Universe Bridging)
- Dimensional gates, reality forks, timeline stabilizers
- Access to other universes and the multiverse

---

### Tier 6: Post-Scarcity Manufacturing

Post-scarcity technology eliminates resource constraints through molecular-level manufacturing.

```typescript
/**
 * Matter Compiler - Star Trek replicator
 * Assembles items atom-by-atom from energy
 */
interface MatterCompilerComponent extends Component {
  readonly type: 'matter_compiler';

  /** Current compilation recipe */
  currentRecipe?: CompilationRecipe;

  /** Progress (0-100) */
  progress: number;

  /** Energy cost per atom assembled */
  energyPerAtom: number;

  /** Maximum complexity (atomic structures) */
  maxComplexity: number;

  /** Can this compile organic matter? */
  organicCapable: boolean;

  /** Can this compile thinking beings? (ethical constraint) */
  consciousnessCapable: boolean;
}

interface CompilationRecipe {
  id: string;
  name: string;

  /** Target item to compile */
  outputItem: { itemId: string; amount: number };

  /** Energy cost (in megajoules) */
  energyCost: number;

  /** Atomic complexity (determines compile time) */
  atomicComplexity: number;

  /** Molecular template data */
  template: MolecularTemplate;

  /** Compilation time */
  compileTime: number;
}

interface MolecularTemplate {
  /** Atomic composition (e.g., C:1000, H:1500, O:200) */
  atomicComposition: Map<string, number>;

  /** Molecular structure complexity */
  complexity: number;

  /** Is this organic? */
  organic: boolean;

  /** Does this have consciousness? */
  conscious: boolean;
}

/**
 * Matter Compiler building
 */
const MATTER_COMPILER = defineBuildingBlueprint({
  id: 'matter_compiler',
  name: 'Matter Compiler',
  description: 'Assemble items atom-by-atom from pure energy. Post-scarcity manufacturing.',
  cost: [
    { itemId: 'antimatter_containment', amount: 5 },
    { itemId: 'quantum_processor', amount: 10 },
    { itemId: 'exotic_matter', amount: 20 },
    { itemId: 'assembly_machine_iii', amount: 1 },
  ],
  buildTime: 500,
  size: { width: 5, height: 5 },
  functionality: [
    {
      type: 'matter_compiler',
      energyPerAtom: 0.001,  // MJ per atom
      maxComplexity: 1000000,  // Can handle complex molecules
      organicCapable: true,
      consciousnessCapable: false,  // Ethical safeguard
    },
    {
      type: 'power_consumption',
      powerType: 'exotic',
      consumption: 10000,  // 10 MW
    },
  ],
  requiredResearch: 'post_scarcity_i',
});

/**
 * Self-Replicating Machine (Von Neumann)
 */
interface VonNeumannComponent extends Component {
  readonly type: 'von_neumann';

  /** Replication progress (0-100) */
  replicationProgress: number;

  /** What is this machine currently building? */
  currentProject?: 'self_copy' | 'factory' | 'infrastructure';

  /** Resource buffer for replication */
  resourceBuffer: ItemInstance[];

  /** Has this reached maximum replication limit? */
  replicationLimitReached: boolean;

  /** Maximum copies this lineage can produce */
  maxCopies: number;

  /** Current generation (0 = original) */
  generation: number;
}

const VON_NEUMANN_CONSTRUCTOR = defineBuildingBlueprint({
  id: 'von_neumann_constructor',
  name: 'Von Neumann Constructor',
  description: 'Self-replicating machine. Can duplicate itself and build infrastructure autonomously.',
  cost: [
    { itemId: 'quantum_processor', amount: 20 },
    { itemId: 'programmable_matter', amount: 50 },
    { itemId: 'construction_robot', amount: 10 },
  ],
  buildTime: 800,
  functionality: [
    {
      type: 'von_neumann',
      maxCopies: 100,  // Prevent exponential disaster
      generation: 0,
    },
  ],
  requiredResearch: 'self_replication',
});
```

### Tier 7: Exotic Physics Manipulation

Exotic physics technology manipulates fundamental forces and spacetime itself.

```typescript
/**
 * Zero-Point Energy Extractor
 * Harvests energy from quantum vacuum fluctuations
 */
interface ZeroPointExtractorComponent extends Component {
  readonly type: 'zero_point_extractor';

  /** Energy extraction rate (MW) */
  extractionRate: number;

  /** Vacuum instability (0-1, higher = risk of cascade) */
  vacuumInstability: number;

  /** Has this triggered a false vacuum decay? */
  falseVacuumDecayTriggered: boolean;

  /** Casimir cavity dimensions */
  cavitySize: number;
}

const ZERO_POINT_EXTRACTOR = defineBuildingBlueprint({
  id: 'zero_point_extractor',
  name: 'Zero-Point Energy Extractor',
  description: 'Harvests infinite energy from quantum vacuum. WARNING: Destabilizes local spacetime.',
  cost: [
    { itemId: 'exotic_matter', amount: 100 },
    { itemId: 'antimatter_containment', amount: 50 },
    { itemId: 'quantum_processor', amount: 30 },
  ],
  buildTime: 1000,
  functionality: [
    {
      type: 'power_generation',
      powerType: 'exotic',
      baseGeneration: 100000,  // 100 MW infinite power
    },
    {
      type: 'zero_point_extractor',
      extractionRate: 100000,
      vacuumInstability: 0.01,  // 1% risk per hour
    },
  ],
  requiredResearch: 'exotic_physics_i',
  help: {
    summary: 'Infinite power from quantum vacuum. May destroy universe.',
    description: 'Extracts energy from quantum vacuum fluctuations via Casimir effect. Provides effectively infinite power but slowly destabilizes local spacetime. Prolonged use risks false vacuum decay (universe-destroying phase transition). Use with caution.',
    warnings: ['Vacuum instability increases over time', 'May trigger false vacuum decay', 'Can destroy local reality'],
  },
});

/**
 * Gravity Manipulator
 * Creates artificial gravity wells and anti-gravity fields
 */
interface GravityManipulatorComponent extends Component {
  readonly type: 'gravity_manipulator';

  /** Gravity field strength (-10 to +10 G) */
  fieldStrength: number;

  /** Affected radius (tiles) */
  radius: number;

  /** Current mode */
  mode: 'attract' | 'repel' | 'null' | 'lensing';

  /** Exotic matter consumption */
  exoticMatterConsumption: number;
}

const GRAVITY_MANIPULATOR = defineBuildingBlueprint({
  id: 'gravity_manipulator',
  name: 'Gravity Manipulator',
  description: 'Locally alter gravitational fields. Enables flight, hovering structures, and spacetime warping.',
  cost: [
    { itemId: 'exotic_matter', amount: 200 },
    { itemId: 'antimatter_containment', amount: 100 },
  ],
  buildTime: 1200,
  functionality: [
    {
      type: 'gravity_manipulator',
      fieldStrength: 5,
      radius: 50,
      mode: 'null',
      exoticMatterConsumption: 1,  // per tick
    },
  ],
  requiredResearch: 'exotic_physics_ii',
});

/**
 * Wormhole Stabilizer
 * Creates and maintains traversable wormholes
 */
interface WormholeStabilizerComponent extends Component {
  readonly type: 'wormhole_stabilizer';

  /** Wormhole status */
  status: 'closed' | 'forming' | 'stable' | 'collapsing' | 'collapsed';

  /** Linked destination stabilizer ID */
  destinationId?: string;

  /** Maximum transfer distance (tiles, 0 = unlimited) */
  maxDistance: number;

  /** Exotic matter required to maintain */
  maintenanceCost: number;

  /** Throat radius (affects throughput) */
  throatRadius: number;

  /** Is this wormhole traversable? */
  traversable: boolean;
}

const WORMHOLE_STABILIZER = defineBuildingBlueprint({
  id: 'wormhole_stabilizer',
  name: 'Wormhole Stabilizer',
  description: 'Creates traversable wormholes for instant transport across any distance.',
  cost: [
    { itemId: 'exotic_matter', amount: 500 },
    { itemId: 'quantum_processor', amount: 100 },
    { itemId: 'antimatter_containment', amount: 200 },
  ],
  buildTime: 2000,
  functionality: [
    {
      type: 'wormhole_stabilizer',
      maxDistance: 0,  // Unlimited
      throatRadius: 10,  // 10 tile diameter
      traversable: true,
    },
    {
      type: 'power_consumption',
      powerType: 'exotic',
      consumption: 50000,  // 50 MW
    },
  ],
  requiredResearch: 'exotic_physics_iii',
});
```

### Tier 8: Multiversal Technology

Multiversal technology enables access to parallel universes and the greater multiverse.

```typescript
/**
 * Dimensional Anchor
 * Stabilizes position across dimensional shifts
 */
interface DimensionalAnchorComponent extends Component {
  readonly type: 'dimensional_anchor';

  /** Current universe ID this is anchored to */
  anchoredUniverseId: string;

  /** Dimensional stability (0-1) */
  stability: number;

  /** Linked anchors in other universes */
  linkedAnchors: Set<string>;

  /** Can entities pass through? */
  entityTraversable: boolean;

  /** Maximum entity size that can traverse */
  maxEntitySize: number;
}

/**
 * Universe Gate
 * Portal to other universes (integrates with MultiverseCrossing system)
 */
interface UniverseGateComponent extends Component {
  readonly type: 'universe_gate';

  /** Gate status */
  status: 'inactive' | 'calibrating' | 'open' | 'unstable' | 'collapsed';

  /** Target universe ID */
  targetUniverseId?: string;

  /** Destination anchor ID in target universe */
  destinationAnchorId?: string;

  /** Exotic matter cost per entity traversal */
  traversalCost: number;

  /** Total entities that have crossed */
  crossingCount: number;

  /** Is two-way travel enabled? */
  bidirectional: boolean;

  /** Dimensional coordinates */
  coordinates: DimensionalCoordinates;
}

interface DimensionalCoordinates {
  /** Universe ID in multiverse */
  universeId: string;

  /** Spatial coordinates within universe */
  position: { x: number; y: number; z: number };

  /** Temporal coordinate (for timeline branching) */
  timeline: number;

  /** Probability branch (for quantum multiverse) */
  branch: string;
}

/**
 * Integration with existing MultiverseCrossing system
 */
function createUniverseGateCrossing(
  sourceGate: UniverseGateComponent,
  targetGate: UniverseGateComponent,
  world: World
): MultiverseCrossing {
  return {
    id: crypto.randomUUID(),
    type: 'technological',  // vs 'divine' or 'natural'
    sourceUniverse: sourceGate.coordinates.universeId,
    targetUniverse: targetGate.coordinates.universeId,
    difficulty: 'advanced',
    restrictions: {
      entityTypes: ['agent', 'item', 'building'],
      maxSize: sourceGate.maxEntitySize ?? 10,
      requiresPreparation: true,
      exoticMatterCost: sourceGate.traversalCost,
    },
    discoveryMethod: 'constructed',
    discoveredAt: world.tick,
  };
}

const UNIVERSE_GATE = defineBuildingBlueprint({
  id: 'universe_gate',
  name: 'Universe Gate',
  description: 'Portal to parallel universes. Requires dimensional anchor in target universe.',
  cost: [
    { itemId: 'exotic_matter', amount: 1000 },
    { itemId: 'quantum_processor', amount: 500 },
    { itemId: 'wormhole_stabilizer', amount: 1 },
    { itemId: 'dimensional_anchor', amount: 2 },
  ],
  buildTime: 5000,
  size: { width: 10, height: 10 },
  functionality: [
    {
      type: 'universe_gate',
      traversalCost: 100,  // 100 exotic matter per crossing
      bidirectional: true,
    },
    {
      type: 'power_consumption',
      powerType: 'exotic',
      consumption: 200000,  // 200 MW
    },
  ],
  requiredResearch: 'multiversal_i',
});

/**
 * Reality Fork Machine
 * Creates new universe branches (integrates with UniverseModification)
 */
interface RealityForkComponent extends Component {
  readonly type: 'reality_fork';

  /** Forking status */
  status: 'idle' | 'calculating' | 'forking' | 'complete' | 'failed';

  /** Fork parameters */
  forkParams?: UniverseForkParameters;

  /** Created universe ID */
  createdUniverseId?: string;

  /** Energy cost to create fork */
  forkEnergyCost: number;

  /** Causal isolation (prevent time paradoxes) */
  causallyIsolated: boolean;
}

interface UniverseForkParameters {
  /** Base universe to fork from */
  sourceUniverseId: string;

  /** What to change in the fork */
  modifications: UniverseModification[];

  /** Divergence point (game tick) */
  divergencePoint: number;

  /** Fork name/identifier */
  forkName: string;

  /** Is this fork stable? */
  stable: boolean;
}

const REALITY_FORK_MACHINE = defineBuildingBlueprint({
  id: 'reality_fork_machine',
  name: 'Reality Fork Machine',
  description: 'Creates new universe branches. Modify physics, history, or fundamental constants.',
  cost: [
    { itemId: 'exotic_matter', amount: 5000 },
    { itemId: 'quantum_processor', amount: 1000 },
    { itemId: 'probability_engine', amount: 1 },
  ],
  buildTime: 10000,
  functionality: [
    {
      type: 'reality_fork',
      forkEnergyCost: 1000000,  // 1000 MW-hours
      causallyIsolated: true,
    },
  ],
  requiredResearch: 'multiversal_iii',
});

/**
 * Probability Engine
 * Manipulates quantum probability fields
 */
interface ProbabilityEngineComponent extends Component {
  readonly type: 'probability_engine';

  /** Current probability field strength */
  fieldStrength: number;

  /** Affected radius */
  radius: number;

  /** Desired outcome probability (0-1) */
  targetProbability: number;

  /** What event is being influenced */
  targetEvent?: ProbabilityEvent;

  /** Quantum decoherence risk */
  decoherenceRisk: number;
}

interface ProbabilityEvent {
  type: string;
  description: string;
  baseProbability: number;
  desiredProbability: number;
}

const PROBABILITY_ENGINE = defineBuildingBlueprint({
  id: 'probability_engine',
  name: 'Probability Engine',
  description: 'Manipulates quantum probability. Influence chance, luck, and outcomes.',
  cost: [
    { itemId: 'exotic_matter', amount: 2000 },
    { itemId: 'quantum_processor', amount: 500 },
  ],
  buildTime: 3000,
  functionality: [
    {
      type: 'probability_engine',
      fieldStrength: 0.5,
      radius: 100,
      decoherenceRisk: 0.05,
    },
  ],
  requiredResearch: 'multiversal_ii',
});
```

### Clarke Tech Items & Resources

```typescript
/**
 * Exotic matter - negative mass/energy density
 * Required for all Clarke Tech
 */
export const EXOTIC_MATTER = defineItem('exotic_matter', 'Exotic Matter', 'material', {
  weight: -1.0,  // Negative mass!
  stackSize: 10,
  baseMaterial: 'exotic',
  baseValue: 10000,
  rarity: 'legendary',
  help: {
    summary: 'Matter with negative mass-energy. Enables spacetime manipulation.',
    description: 'Exotic matter has negative mass-energy density, allowing it to violate the weak energy condition. Essential for wormhole stabilization, faster-than-light travel, and reality manipulation. Extremely rare and expensive to produce.',
    warnings: ['Unstable', 'Can trigger vacuum decay', 'Handle with extreme caution'],
  },
});

/**
 * Antimatter containment
 */
export const ANTIMATTER_CONTAINMENT = defineItem(
  'antimatter_containment',
  'Antimatter Containment Unit',
  'material',
  {
    weight: 50,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'exotic_matter', amount: 10 },
      { itemId: 'advanced_circuit', amount: 100 },
      { itemId: 'steel_ingot', amount: 500 },
    ],
    baseValue: 50000,
    rarity: 'legendary',
    help: {
      summary: 'Magnetic containment for antimatter fuel.',
      description: 'Stores antimatter in a magnetic bottle, preventing contact with normal matter. Used in antimatter reactors and exotic physics experiments. Loss of containment results in complete matter-antimatter annihilation.',
    },
  }
);

/**
 * Quantum processor
 */
export const QUANTUM_PROCESSOR = defineItem(
  'quantum_processor',
  'Quantum Processor',
  'material',
  {
    weight: 0.1,
    stackSize: 50,
    craftedFrom: [
      { itemId: 'advanced_circuit', amount: 10 },
      { itemId: 'exotic_matter', amount: 1 },
      { itemId: 'mana_crystal', amount: 5 },
    ],
    baseValue: 5000,
    rarity: 'rare',
    help: {
      summary: 'Quantum computer on a chip. Solves NP-hard problems instantly.',
      description: 'A quantum processor uses superposition and entanglement to perform computations impossible for classical computers. Essential for matter compilation, probability manipulation, and dimensional calculations.',
    },
  }
);

/**
 * Programmable matter
 */
export const PROGRAMMABLE_MATTER = defineItem(
  'programmable_matter',
  'Programmable Matter',
  'material',
  {
    weight: 1.0,
    stackSize: 100,
    baseValue: 1000,
    rarity: 'rare',
    help: {
      summary: 'Smart matter that reconfigures on command.',
      description: 'Programmable matter can change its physical properties, shape, and function based on programmed instructions. Used in Von Neumann constructors, adaptive structures, and morphing tools.',
    },
  }
);
```

### Research Tree for Clarke Tech

```typescript
/**
 * TIER 6: Post-Scarcity Research
 */
export const POST_SCARCITY_I = defineResearch(
  'post_scarcity_i',
  'Molecular Manufacturing',
  'Assemble items atom-by-atom. The age of scarcity ends.',
  'production',
  6,
  {
    progressRequired: 2000,
    prerequisites: ['production_iv', 'arcane_studies', 'quantum_mechanics'],
    unlocks: [
      { type: 'building', buildingId: 'matter_compiler' },
      { type: 'item', itemId: 'quantum_processor' },
      { type: 'item', itemId: 'programmable_matter' },
      { type: 'recipe', recipeId: 'antimatter_production' },
    ],
  }
);

export const SELF_REPLICATION = defineResearch(
  'self_replication',
  'Self-Replicating Machines',
  'Von Neumann constructors that build copies of themselves.',
  'production',
  6,
  {
    progressRequired: 2500,
    prerequisites: ['post_scarcity_i', 'robotics_iii'],
    unlocks: [
      { type: 'building', buildingId: 'von_neumann_constructor' },
      { type: 'ability', abilityId: 'autonomous_expansion' },
    ],
  }
);

/**
 * TIER 7: Exotic Physics Research
 */
export const EXOTIC_PHYSICS_I = defineResearch(
  'exotic_physics_i',
  'Zero-Point Energy',
  'Harvest infinite energy from quantum vacuum fluctuations.',
  'production',
  7,
  {
    progressRequired: 3000,
    prerequisites: ['post_scarcity_i', 'arcane_studies'],
    unlocks: [
      { type: 'building', buildingId: 'zero_point_extractor' },
      { type: 'item', itemId: 'exotic_matter' },
      { type: 'knowledge', knowledgeId: 'casimir_effect' },
    ],
  }
);

export const EXOTIC_PHYSICS_II = defineResearch(
  'exotic_physics_ii',
  'Gravity Manipulation',
  'Locally alter gravitational fields. Defy physics.',
  'logistics',
  7,
  {
    progressRequired: 3500,
    prerequisites: ['exotic_physics_i'],
    unlocks: [
      { type: 'building', buildingId: 'gravity_manipulator' },
      { type: 'building', buildingId: 'antigravity_platform' },
      { type: 'ability', abilityId: 'gravity_control' },
    ],
  }
);

export const EXOTIC_PHYSICS_III = defineResearch(
  'exotic_physics_iii',
  'Wormhole Engineering',
  'Create and stabilize traversable wormholes.',
  'logistics',
  7,
  {
    progressRequired: 4000,
    prerequisites: ['exotic_physics_ii'],
    unlocks: [
      { type: 'building', buildingId: 'wormhole_stabilizer' },
      { type: 'item', itemId: 'antimatter_containment' },
      { type: 'knowledge', knowledgeId: 'spacetime_topology' },
    ],
  }
);

/**
 * TIER 8: Multiversal Research
 */
export const MULTIVERSAL_I = defineResearch(
  'multiversal_i',
  'Dimensional Anchoring',
  'Stabilize position across dimensional shifts. First step to universe gates.',
  'logistics',
  8,
  {
    progressRequired: 5000,
    prerequisites: ['exotic_physics_iii', 'dimensional_magic'],
    unlocks: [
      { type: 'building', buildingId: 'dimensional_anchor' },
      { type: 'building', buildingId: 'universe_gate' },
      { type: 'ability', abilityId: 'multiverse_navigation' },
    ],
  }
);

export const MULTIVERSAL_II = defineResearch(
  'multiversal_ii',
  'Probability Manipulation',
  'Influence quantum probability fields. Control chance itself.',
  'production',
  8,
  {
    progressRequired: 6000,
    prerequisites: ['multiversal_i'],
    unlocks: [
      { type: 'building', buildingId: 'probability_engine' },
      { type: 'ability', abilityId: 'quantum_luck' },
      { type: 'knowledge', knowledgeId: 'many_worlds_interpretation' },
    ],
  }
);

export const MULTIVERSAL_III = defineResearch(
  'multiversal_iii',
  'Reality Forking',
  'Create new universe branches. Become a multiverse architect.',
  'production',
  8,
  {
    progressRequired: 10000,
    prerequisites: ['multiversal_ii'],
    unlocks: [
      { type: 'building', buildingId: 'reality_fork_machine' },
      { type: 'ability', abilityId: 'universe_creation' },
      { type: 'knowledge', knowledgeId: 'multiverse_theory' },
    ],
  }
);
```

### Temporal Technology - Post-Game Time Travel

**Time travel is unlocked by beating the game.** Canonical events create automatic save points. Time travel is expensive, one-way, and creates new timeline branches.

### Canonical Event Auto-Saving

The game automatically saves at **canonical events** - major historical moments detected by the `CanonEventDetector` system.

```typescript
/**
 * Integration with existing CanonEventDetector
 * Canonical events automatically create temporal snapshots
 */
interface CanonicalEventSnapshot {
  /** Save file ID */
  saveId: string;

  /** Canonical event that triggered this */
  canonEventId: string;

  /** Event name (e.g., "First City Founded", "First War", "First Deity Emerged") */
  eventName: string;

  /** Full game state at this point */
  gameState: SerializedGameState;

  /** Timeline metadata */
  timeline: {
    universeId: string;
    timelineId: string;
    tick: number;
    parentTimeline?: string;  // If this is a branch
    divergencePoint?: number;  // When did this branch split
  };

  /** Can this be used as a time travel destination? */
  travelEnabled: boolean;

  /** Timestamp */
  createdAt: number;
}

/**
 * Time travel is ONLY possible to canonical events
 * These are automatic save points at major historical moments
 */
type CanonicalEventType =
  | 'first_city_founded'
  | 'first_war_started'
  | 'first_deity_emerged'
  | 'first_magic_discovered'
  | 'civilization_peak'
  | 'great_disaster'
  | 'technological_singularity'
  | 'universe_gate_opened'
  | 'game_completed';  // Beating the game

/**
 * Extend CanonEventDetector to create time travel save points
 */
function onCanonicalEventDetected(event: CanonicalEvent, world: World): void {
  // Create automatic save
  const snapshot: CanonicalEventSnapshot = {
    saveId: crypto.randomUUID(),
    canonEventId: event.id,
    eventName: event.name,
    gameState: world.serialize(),
    timeline: {
      universeId: world.universeId,
      timelineId: world.timelineId,
      tick: world.tick,
    },
    travelEnabled: world.gameCompleted,  // Only after beating game
    createdAt: Date.now(),
  };

  world.saveLoadService.saveCanonicalSnapshot(snapshot);

  // Emit event
  world.eventBus.emit({
    type: 'temporal:canonical_event_saved',
    data: {
      eventName: event.name,
      snapshotId: snapshot.saveId,
      travelEnabled: snapshot.travelEnabled,
    },
  });
}
```

### Chrono Zapper - Consumable Time Travel

**Chrono Zappers** are expensive, single-use devices that create one-way portals to canonical events.

```typescript
/**
 * Chrono Zapper Item - Single-use time travel device
 * Creates a one-way portal to a canonical event
 */
export const CHRONO_ZAPPER = defineItem(
  'chrono_zapper',
  'Chrono Zapper',
  'consumable',
  {
    weight: 5.0,
    stackSize: 1,  // Cannot stack - too unstable
    craftedFrom: [
      { itemId: 'exotic_matter', amount: 1000 },
      { itemId: 'quantum_processor', amount: 100 },
      { itemId: 'antimatter_containment', amount: 50 },
      { itemId: 'probability_engine', amount: 1 },
    ],
    baseValue: 1000000,  // Extremely expensive
    rarity: 'legendary',
    traits: {
      consumable: {
        usable: true,
        singleUse: true,
        effect: 'time_travel',
      },
    },
    help: {
      summary: 'Single-use time travel device. Create one-way portal to a canonical event.',
      description: 'The Chrono Zapper opens a temporary wormhole to a specific canonical event in history. Using it transports you and your immediate surroundings to that moment, creating a NEW timeline branch. This is one-way - you cannot return to your original timeline. The zapper is destroyed in the process.',
      warnings: [
        'SINGLE USE - Device destroyed after activation',
        'ONE-WAY TRAVEL - Cannot return to original timeline',
        'Creates new timeline branch at destination',
        'Extremely expensive to craft',
      ],
    },
  }
);

/**
 * Infinite Chrono Zapper - Endgame infinite-use version
 * Post-scarcity time travel
 */
export const INFINITE_CHRONO_ZAPPER = defineItem(
  'infinite_chrono_zapper',
  'Infinite Chrono Zapper',
  'equipment',
  {
    weight: 10.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'chrono_zapper', amount: 100 },  // Requires 100 regular zappers
      { itemId: 'exotic_matter', amount: 10000 },
      { itemId: 'zero_point_extractor', amount: 1 },
      { itemId: 'reality_fork_machine', amount: 1 },
    ],
    baseValue: 100000000,  // Insanely expensive
    rarity: 'legendary',
    traits: {
      equipment: {
        slot: 'tool',
        durability: -1,  // Infinite durability
      },
      consumable: {
        usable: true,
        singleUse: false,  // Infinite uses!
        effect: 'time_travel',
      },
    },
    help: {
      summary: 'Infinite-use time travel device. The ultimate temporal tool.',
      description: 'An infinitely-rechargeable Chrono Zapper powered by zero-point energy. Allows unlimited time travel to any canonical event. Still creates new timeline branches, but you can travel as many times as you want. The pinnacle of temporal technology.',
      warnings: [
        'INFINITE USES - Never breaks',
        'ONE-WAY TRAVEL - Cannot return to original timeline',
        'Creates new timeline branch at destination',
        'Requires post-scarcity manufacturing',
      ],
    },
  }
);

/**
 * Time travel mechanics - creates NEW timeline at destination
 */
interface ChronoZapperUse {
  /** Which canonical event to travel to */
  targetEventId: string;

  /** Traveler entity */
  travelerId: string;

  /** Radius of effect (entities within this distance travel too) */
  radius: number;

  /** Result */
  result: 'success' | 'failed' | 'paradox';

  /** Newly created timeline ID */
  newTimelineId?: string;

  /** Entities that traveled */
  travelers: string[];
}

/**
 * Execute chrono zapper use
 */
function useChronoZapper(
  zapper: ItemInstance,
  targetEvent: CanonicalEventSnapshot,
  user: Entity,
  world: World
): ChronoZapperUse {
  // Check if time travel is unlocked
  if (!world.gameCompleted) {
    return {
      targetEventId: targetEvent.canonEventId,
      travelerId: user.id,
      radius: 5,
      result: 'failed',
      travelers: [],
    };
  }

  // Check if destination is valid
  if (!targetEvent.travelEnabled) {
    return {
      targetEventId: targetEvent.canonEventId,
      travelerId: user.id,
      radius: 5,
      result: 'failed',
      travelers: [],
    };
  }

  // Create NEW timeline branch at the destination
  const newTimelineId = crypto.randomUUID();
  world.timelineRegistry.registerBranch({
    id: newTimelineId,
    parentId: targetEvent.timeline.timelineId,
    divergencePoint: targetEvent.timeline.tick,
    createdAt: Date.now(),
    reason: 'chrono_zapper',
    source: world.timelineId,  // Where we came from
  });

  // Gather entities within radius
  const userPos = user.getComponent<PositionComponent>(CT.Position);
  const nearbyEntities = world.query()
    .with(CT.Position)
    .executeEntities()
    .filter(e => {
      const pos = e.getComponent<PositionComponent>(CT.Position);
      return getDistance(userPos, pos) <= 5;  // 5 tile radius
    });

  const travelerIds = nearbyEntities.map(e => e.id);

  // Load the target event state
  world.deserialize(targetEvent.gameState);
  world.timelineId = newTimelineId;
  world.tick = targetEvent.timeline.tick;

  // Inject travelers into the new timeline
  for (const traveler of nearbyEntities) {
    // Traveler appears at same relative position
    // They have knowledge of the "future" (their original timeline)
    const memory = traveler.getComponent<MemoryComponent>(CT.Memory);
    if (memory) {
      memory.addMemory({
        type: 'time_travel',
        description: `Traveled from the future at tick ${world.tick}`,
        sourceTimeline: world.timelineId,
        futureKnowledge: true,
      });
    }
  }

  // Destroy zapper if single-use
  const itemDef = getItemDefinition(zapper.definitionId);
  if (itemDef.traits?.consumable?.singleUse) {
    removeFromInventory(user.getComponent(CT.Inventory), zapper.definitionId, 1);
  }

  // Emit event
  world.eventBus.emit({
    type: 'temporal:time_travel_executed',
    data: {
      targetEvent: targetEvent.eventName,
      newTimelineId,
      travelerCount: travelerIds.length,
      sourceTimeline: world.timelineId,
      destinationTick: targetEvent.timeline.tick,
    },
  });

  return {
    targetEventId: targetEvent.canonEventId,
    travelerId: user.id,
    radius: 5,
    result: 'success',
    newTimelineId,
    travelers: travelerIds,
  };
}
```

### Future Travel - Limited by What Exists

You can only travel to the "future" if that future has already been played.

```typescript
/**
 * Future travel is only possible to timelines that exist
 * Cannot travel to a future that hasn't happened yet
 */
function canTravelToFuture(
  targetTick: number,
  targetTimelineId: string,
  world: World
): boolean {
  // Get the target timeline
  const timeline = world.timelineRegistry.getTimeline(targetTimelineId);
  if (!timeline) return false;

  // Find snapshots in that timeline
  const snapshots = world.saveLoadService.getAllCanonicalSnapshots()
    .filter(s => s.timeline.timelineId === targetTimelineId);

  // Can only travel to ticks that have canonical events
  const hasCanonicalEventAtTick = snapshots.some(s => s.timeline.tick === targetTick);

  return hasCanonicalEventAtTick;
}

/**
 * Available destinations for time travel
 */
function getAvailableTimelineDestinations(world: World): CanonicalEventSnapshot[] {
  if (!world.gameCompleted) {
    return [];  // Time travel locked until game completed
  }

  const allSnapshots = world.saveLoadService.getAllCanonicalSnapshots();

  // Can travel to any canonical event in any timeline that exists
  return allSnapshots.filter(s => s.travelEnabled);
}

/**
 * Timeline genealogy for UI display
 */
interface TimelineGenealogy {
  /** Current timeline */
  current: string;

  /** All timelines that exist */
  timelines: TimelineNode[];

  /** Canonical events across all timelines */
  events: CanonicalEventSnapshot[];
}

interface TimelineNode {
  id: string;
  parentId?: string;
  divergencePoint?: number;
  reason: string;
  sourceTimeline?: string;  // For chrono zapper branches
  status: 'active' | 'dormant';
  canonicalEvents: CanonicalEventSnapshot[];
}

/**
 * Timeline Viewer Building
 * Browse canonical events and timeline genealogy
 */
const TIMELINE_VIEWER = defineBuildingBlueprint({
  id: 'timeline_viewer',
  name: 'Timeline Viewer',
  description: 'Visualize canonical events and timeline branches. See where you can time travel.',
  cost: [
    { itemId: 'exotic_matter', amount: 300 },
    { itemId: 'quantum_processor', amount: 100 },
  ],
  buildTime: 2000,
  functionality: [
    {
      type: 'timeline_viewer',
      viewMode: 'branching',
      maxDepth: 10,
    },
  ],
  requiredResearch: 'temporal_mechanics_i',
  help: {
    summary: 'Browse canonical events. See available time travel destinations.',
    description: 'The Timeline Viewer displays all canonical events that have occurred across all timeline branches. Shows which events you can travel to with a Chrono Zapper. Only available after beating the game.',
  },
});
```

### Temporal Research Tree

```typescript
/**
 * Temporal Mechanics Research
 * LOCKED until game is completed
 */
export const TEMPORAL_MECHANICS_I = defineResearch(
  'temporal_mechanics_i',
  'Temporal Observation',
  'Browse canonical events and timeline branches. See where time travel is possible.',
  'logistics',
  8,
  {
    progressRequired: 5000,
    prerequisites: ['multiversal_ii', 'quantum_mechanics', 'game_completed'],
    unlocks: [
      { type: 'building', buildingId: 'timeline_viewer' },
      { type: 'knowledge', knowledgeId: 'canonical_events' },
    ],
  }
);

export const TEMPORAL_MECHANICS_II = defineResearch(
  'temporal_mechanics_ii',
  'Chrono Zapper Fabrication',
  'Craft single-use time travel devices. Expensive but functional.',
  'production',
  8,
  {
    progressRequired: 7000,
    prerequisites: ['temporal_mechanics_i', 'post_scarcity_i'],
    unlocks: [
      { type: 'item', itemId: 'chrono_zapper' },
      { type: 'recipe', recipeId: 'chrono_zapper_crafting' },
      { type: 'ability', abilityId: 'time_travel' },
    ],
  }
);

export const TEMPORAL_MECHANICS_III = defineResearch(
  'temporal_mechanics_iii',
  'Infinite Chrono Zapper',
  'Create infinite-use time travel device. Post-scarcity temporal freedom.',
  'production',
  8,
  {
    progressRequired: 10000,
    prerequisites: ['temporal_mechanics_ii', 'self_replication'],
    unlocks: [
      { type: 'item', itemId: 'infinite_chrono_zapper' },
      { type: 'recipe', recipeId: 'infinite_chrono_zapper_crafting' },
      { type: 'knowledge', knowledgeId: 'timeline_mastery' },
    ],
  }
);
```

---

### Integration with Existing Multiverse Systems

```typescript
/**
 * Connect Clarke Tech gates to MultiverseCrossing system
 */
class UniverseGateSystem implements System {
  public readonly id: SystemId = 'universe_gate';
  public readonly priority: number = 60;

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const gate = entity.getComponent<UniverseGateComponent>(CT.UniverseGate);
      if (!gate) continue;

      if (gate.status === 'open' && gate.destinationAnchorId) {
        // Check for entities wanting to traverse
        const pos = entity.getComponent<PositionComponent>(CT.Position);
        const nearbyEntities = world.query()
          .with(CT.Position)
          .executeEntities()
          .filter(e => {
            const ePos = e.getComponent<PositionComponent>(CT.Position);
            return getDistance(pos, ePos) <= 2;  // Within 2 tiles
          });

        for (const crossingEntity of nearbyEntities) {
          // Check if they want to cross
          const agent = crossingEntity.getComponent<AgentComponent>(CT.Agent);
          if (!agent?.wantsToTraverseGate) continue;

          // Check exotic matter cost
          const inventory = crossingEntity.getComponent<InventoryComponent>(CT.Inventory);
          const hasExoticMatter = hasItem(inventory, 'exotic_matter', gate.traversalCost);

          if (!hasExoticMatter) {
            // Not enough exotic matter
            continue;
          }

          // Perform crossing using MultiverseCrossing system
          const crossing = this.getCrossingForGate(gate, world);
          if (!crossing) continue;

          // Remove exotic matter
          removeFromInventory(inventory, 'exotic_matter', gate.traversalCost);

          // Transfer entity to target universe
          this.transferToUniverse(
            crossingEntity,
            gate.targetUniverseId!,
            gate.destinationAnchorId,
            world
          );

          // Increment crossing count
          gate.crossingCount++;

          // Emit event
          world.eventBus.emit({
            type: 'multiverse:entity_crossed',
            source: entity.id,
            target: crossingEntity.id,
            data: {
              sourceUniverse: world.universeId,
              targetUniverse: gate.targetUniverseId,
              gateId: entity.id,
            },
          });
        }
      }
    }
  }

  private getCrossingForGate(
    gate: UniverseGateComponent,
    world: World
  ): MultiverseCrossing | null {
    // Query MultiverseCrossing registry
    const crossings = world.multiverseRegistry.getCrossingsForUniverse(world.universeId);
    return crossings.find(c =>
      c.sourceUniverse === world.universeId &&
      c.targetUniverse === gate.targetUniverseId &&
      c.type === 'technological'
    ) ?? null;
  }

  private transferToUniverse(
    entity: Entity,
    targetUniverseId: string,
    destinationAnchorId: string,
    world: World
  ): void {
    // This would integrate with the multiverse manager
    world.multiverseManager.transferEntity(
      entity,
      world.universeId,
      targetUniverseId,
      destinationAnchorId
    );
  }
}

/**
 * Reality Fork integration with UniverseModification
 */
function createRealityFork(
  forkParams: UniverseForkParameters,
  world: World
): string {
  // Create new universe using UniverseModification system
  const newUniverseId = crypto.randomUUID();

  const modifications: UniverseModification[] = forkParams.modifications;

  // Register new universe
  world.multiverseRegistry.registerUniverse({
    id: newUniverseId,
    name: forkParams.forkName,
    parentUniverse: forkParams.sourceUniverseId,
    divergencePoint: forkParams.divergencePoint,
    modifications,
    stable: forkParams.stable,
    createdAt: world.tick,
    creationMethod: 'reality_fork_machine',
  });

  return newUniverseId;
}
```

---

### Extra-Temporal Species - Genetic Timeline Jumping

**Post-temporal societies** are species that have evolved or developed genetic/spiritual abilities to traverse timelines naturally, without technology. Some species like the **Fae** and other **higher-dimensional entities** can freely move between timeline branches as an inherent biological trait.

This creates interesting dynamics where some civilizations naturally possess abilities that others need Tier 8 Clarke Tech to achieve.

### Extra-Temporal Trait Component

```typescript
/**
 * Extra-Temporal Trait - Species ability to traverse timelines
 * Found in Fae, higher-dimensional beings, and post-temporal species
 */
interface ExtraTemporalComponent extends Component {
  readonly type: 'extra_temporal';

  /** Strength of temporal ability */
  temporalPower: 'minor' | 'major' | 'supreme';

  /** Whether entity can perceive other timelines */
  timelinePerception: boolean;

  /** Whether entity can jump between timelines */
  canTimelineJump: boolean;

  /** Whether entity can jump to arbitrary points or only canonical events */
  requiresCanonicalEvent: boolean;

  /** Cool-down between jumps (ticks) */
  jumpCooldown: number;

  /** Current cool-down remaining */
  cooldownRemaining: number;

  /** Whether entity exists across multiple timelines simultaneously */
  multiversalPresence: boolean;

  /** All timeline IDs where this entity exists */
  activeTimelines: string[];

  /** Cost per jump (if any) - in mana, stamina, or other resource */
  jumpCost?: {
    resource: 'mana' | 'stamina' | 'divinity' | 'lifeforce';
    amount: number;
  };

  /** Whether this ability is genetic (inherited) or learned */
  origin: 'genetic' | 'spiritual' | 'ascended' | 'technological_implant';

  /** Chance of mishap when jumping */
  mishapChance: number;

  /** Whether affected by technological time travel restrictions */
  bypassesGameCompletionLock: boolean;
}
```

### Temporal Power Levels

Different species have different strengths of temporal ability:

```typescript
/**
 * Temporal Power Tiers
 */
const TEMPORAL_POWER_LEVELS = {
  /** Minor - Can perceive timelines, occasional jumps */
  minor: {
    timelinePerception: true,
    canTimelineJump: true,
    requiresCanonicalEvent: true,
    jumpCooldown: 10000,  // ~7 game hours
    multiversalPresence: false,
    mishapChance: 0.1,  // 10% mishap chance
    bypassesGameCompletionLock: false,  // Still needs game completed
  },

  /** Major - Frequent timeline jumping, limited multiversal presence */
  major: {
    timelinePerception: true,
    canTimelineJump: true,
    requiresCanonicalEvent: false,  // Can jump to any point in played timeline
    jumpCooldown: 1000,  // ~40 minutes
    multiversalPresence: true,
    activeTimelineLimit: 3,  // Can exist in 3 timelines simultaneously
    mishapChance: 0.02,  // 2% mishap chance
    bypassesGameCompletionLock: true,  // Can time travel even before game completion
  },

  /** Supreme - Fae-level, true temporal freedom */
  supreme: {
    timelinePerception: true,
    canTimelineJump: true,
    requiresCanonicalEvent: false,
    jumpCooldown: 100,  // ~4 minutes
    multiversalPresence: true,
    activeTimelineLimit: Infinity,  // Exists across all timelines
    mishapChance: 0,  // Never mishaps
    bypassesGameCompletionLock: true,
    canCreateNewTimelines: true,  // Can branch without Chrono Zapper
  },
} as const;
```

### Species with Extra-Temporal Traits

```typescript
/**
 * Example Species with Temporal Abilities
 */
const EXTRA_TEMPORAL_SPECIES = [
  {
    speciesId: 'fae',
    name: 'Fae',
    temporalPower: 'supreme',
    description: 'Higher-dimensional entities that exist across all timelines simultaneously. Can freely traverse temporal branches at will.',
    origin: 'genetic',
    jumpCost: undefined,  // No cost for Fae
    lore: 'The Fae exist outside linear time. They are natives of the multiverse itself, perceiving all timelines as a single tapestry. To them, moving between timeline branches is as natural as breathing.',
  },
  {
    speciesId: 'temporal_ascended',
    name: 'Temporal Ascended',
    temporalPower: 'major',
    description: 'Beings who achieved temporal transcendence through spiritual ascension. Can jump between timelines but require meditation.',
    origin: 'spiritual',
    jumpCost: { resource: 'mana', amount: 500 },
    lore: 'Through intense spiritual practice and enlightenment, some beings transcend temporal limitations. They can perceive the branching nature of reality and move between timelines through deep meditation.',
  },
  {
    speciesId: 'chronomorphs',
    name: 'Chronomorphs',
    temporalPower: 'major',
    description: 'Silicon-based lifeforms that evolved in a universe with unstable time flow. Timeline jumping is part of their survival instinct.',
    origin: 'genetic',
    jumpCost: { resource: 'stamina', amount: 200 },
    lore: 'In their home universe, timeline stability was so poor that organisms had to develop the ability to "slide" between temporal branches to avoid catastrophic timeline collapses. Chronomorphs carry this genetic adaptation.',
  },
  {
    speciesId: 'time_touched',
    name: 'Time-Touched',
    temporalPower: 'minor',
    description: 'Individuals affected by temporal anomalies. Rare genetic mutation grants limited timeline perception and occasional jumps.',
    origin: 'genetic',
    jumpCost: { resource: 'lifeforce', amount: 50 },  // Draining
    lore: 'Sometimes, exposure to temporal rifts or chrono-paradoxes alters an individual at the genetic level. These "Time-Touched" develop a sensitivity to timeline branches and can occasionally force themselves across the temporal divide, though it is exhausting and dangerous.',
  },
] as const;
```

### Extra-Temporal Jump Mechanics

How extra-temporal entities perform timeline jumps:

```typescript
/**
 * Extra-Temporal Jump - Natural timeline traversal
 * Different from Chrono Zapper (which creates NEW timelines)
 * Extra-temporal jumps MOVE the entity between EXISTING timelines
 */
interface ExtraTemporalJump {
  /** Entity performing jump */
  jumperId: string;

  /** Source timeline */
  sourceTimelineId: string;

  /** Target timeline (must already exist) */
  targetTimelineId: string;

  /** Tick to jump to in target timeline */
  targetTick: number;

  /** Result of jump */
  result: 'success' | 'failed' | 'mishap';

  /** If multiversal presence, whether to maintain presence in source */
  maintainSourcePresence?: boolean;
}

/**
 * Execute extra-temporal jump
 */
function executeExtraTemporalJump(
  jumper: Entity,
  targetTimelineId: string,
  targetTick: number,
  maintainPresence: boolean,
  world: World
): ExtraTemporalJump {
  const temporal = jumper.getComponent<ExtraTemporalComponent>(CT.ExtraTemporal);
  if (!temporal) {
    return {
      jumperId: jumper.id,
      sourceTimelineId: world.timelineId,
      targetTimelineId,
      targetTick,
      result: 'failed',
    };
  }

  // Check cooldown
  if (temporal.cooldownRemaining > 0) {
    return {
      jumperId: jumper.id,
      sourceTimelineId: world.timelineId,
      targetTimelineId,
      targetTick,
      result: 'failed',
    };
  }

  // Check if game completion required
  if (!temporal.bypassesGameCompletionLock && !world.gameCompleted) {
    return {
      jumperId: jumper.id,
      sourceTimelineId: world.timelineId,
      targetTimelineId,
      targetTick,
      result: 'failed',
    };
  }

  // Check if target timeline exists
  const targetTimeline = world.timelineRegistry.getTimeline(targetTimelineId);
  if (!targetTimeline) {
    return {
      jumperId: jumper.id,
      sourceTimelineId: world.timelineId,
      targetTimelineId,
      targetTick,
      result: 'failed',
    };
  }

  // Check if target tick exists (can't jump to future that hasn't happened)
  if (targetTick > targetTimeline.currentTick) {
    return {
      jumperId: jumper.id,
      sourceTimelineId: world.timelineId,
      targetTimelineId,
      targetTick,
      result: 'failed',
    };
  }

  // Check if requires canonical event
  if (temporal.requiresCanonicalEvent) {
    const hasCanonicalEvent = world.saveLoadService
      .getAllCanonicalSnapshots()
      .some(s =>
        s.timeline.timelineId === targetTimelineId &&
        s.timeline.tick === targetTick
      );

    if (!hasCanonicalEvent) {
      return {
        jumperId: jumper.id,
        sourceTimelineId: world.timelineId,
        targetTimelineId,
        targetTick,
        result: 'failed',
      };
    }
  }

  // Pay jump cost if any
  if (temporal.jumpCost) {
    const resource = temporal.jumpCost.resource;
    const amount = temporal.jumpCost.amount;

    if (resource === 'mana') {
      const magicUser = jumper.getComponent<MagicUserComponent>(CT.MagicUser);
      if (!magicUser || magicUser.currentMana < amount) {
        return {
          jumperId: jumper.id,
          sourceTimelineId: world.timelineId,
          targetTimelineId,
          targetTick,
          result: 'failed',
        };
      }
      magicUser.currentMana -= amount;
    } else if (resource === 'stamina') {
      const needs = jumper.getComponent<NeedsComponent>(CT.Needs);
      if (!needs || needs.stamina < amount) {
        return {
          jumperId: jumper.id,
          sourceTimelineId: world.timelineId,
          targetTimelineId,
          targetTick,
          result: 'failed',
        };
      }
      needs.stamina -= amount;
    }
    // ... other resource types
  }

  // Roll for mishap
  if (Math.random() < temporal.mishapChance) {
    // Mishap! Arrive at wrong time or wrong timeline
    const mishapTimelines = world.timelineRegistry.getAllTimelines();
    const randomTimeline = mishapTimelines[Math.floor(Math.random() * mishapTimelines.length)];
    const randomTick = Math.floor(Math.random() * randomTimeline.currentTick);

    world.eventBus.emit({
      type: 'temporal:jump_mishap',
      data: {
        jumperId: jumper.id,
        intendedTimeline: targetTimelineId,
        actualTimeline: randomTimeline.id,
        intendedTick: targetTick,
        actualTick: randomTick,
      },
    });

    // Continue with mishap destination...
    targetTimelineId = randomTimeline.id;
    targetTick = randomTick;
  }

  // Perform the jump
  if (temporal.multiversalPresence && maintainPresence) {
    // Clone entity to target timeline (exists in both)
    const targetWorld = world.multiverseManager.getWorld(targetTimelineId);
    if (targetWorld) {
      const clone = jumper.clone();
      targetWorld.addEntity(clone);
      temporal.activeTimelines.push(targetTimelineId);
    }
  } else {
    // Move entity from source to target (standard jump)
    world.removeEntity(jumper.id);
    const targetWorld = world.multiverseManager.getWorld(targetTimelineId);
    if (targetWorld) {
      targetWorld.addEntity(jumper);
      temporal.activeTimelines = [targetTimelineId];
    }
  }

  // Set cooldown
  temporal.cooldownRemaining = temporal.jumpCooldown;

  // Record jump in memory
  const memory = jumper.getComponent<MemoryComponent>(CT.Memory);
  if (memory) {
    memory.addMemory({
      type: 'timeline_jump',
      description: `Jumped from timeline ${world.timelineId} to ${targetTimelineId} at tick ${targetTick}`,
      sourceTimeline: world.timelineId,
      targetTimeline: targetTimelineId,
      jumpMethod: 'extra_temporal',
    });
  }

  // Emit event
  world.eventBus.emit({
    type: 'temporal:extra_temporal_jump',
    data: {
      jumperId: jumper.id,
      sourceTimeline: world.timelineId,
      targetTimeline: targetTimelineId,
      targetTick,
      maintainedPresence: maintainPresence,
      temporalPower: temporal.temporalPower,
    },
  });

  return {
    jumperId: jumper.id,
    sourceTimelineId: world.timelineId,
    targetTimelineId,
    targetTick,
    result: 'success',
    maintainSourcePresence: maintainPresence,
  };
}
```

### Multiversal Presence System

For entities that exist across multiple timelines simultaneously:

```typescript
/**
 * Multiversal Presence Tracker
 * Synchronizes state across timeline instances
 */
class MultiversalPresenceSystem implements System {
  public readonly id: SystemId = 'multiversal_presence';
  public readonly priority: number = 5;  // Early update

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const temporal = entity.getComponent<ExtraTemporalComponent>(CT.ExtraTemporal);
      if (!temporal?.multiversalPresence) continue;

      // Update cooldown
      if (temporal.cooldownRemaining > 0) {
        temporal.cooldownRemaining--;
      }

      // Synchronize knowledge across timeline instances
      this.synchronizeMemories(entity, temporal, world);

      // Check for paradoxes
      this.detectTemporalParadoxes(entity, temporal, world);
    }
  }

  /**
   * Synchronize memories/knowledge across all timeline instances
   */
  private synchronizeMemories(
    entity: Entity,
    temporal: ExtraTemporalComponent,
    world: World
  ): void {
    const memory = entity.getComponent<MemoryComponent>(CT.Memory);
    if (!memory) return;

    // Get all instances of this entity across timelines
    for (const timelineId of temporal.activeTimelines) {
      if (timelineId === world.timelineId) continue;  // Skip self

      const otherWorld = world.multiverseManager.getWorld(timelineId);
      if (!otherWorld) continue;

      const otherInstance = otherWorld.getEntity(entity.id);
      if (!otherInstance) continue;

      const otherMemory = otherInstance.getComponent<MemoryComponent>(CT.Memory);
      if (!otherMemory) continue;

      // Share memories between instances
      // Multiversal entities have unified consciousness
      memory.mergeMemories(otherMemory);
    }
  }

  /**
   * Detect temporal paradoxes (same entity interacting across timelines)
   */
  private detectTemporalParadoxes(
    entity: Entity,
    temporal: ExtraTemporalComponent,
    world: World
  ): void {
    // If entity meets itself in different timelines at same location...
    // This could trigger special events, quests, or even universe instability

    const position = entity.getComponent<PositionComponent>(CT.Position);
    if (!position) return;

    for (const timelineId of temporal.activeTimelines) {
      if (timelineId === world.timelineId) continue;

      const otherWorld = world.multiverseManager.getWorld(timelineId);
      if (!otherWorld) continue;

      // Check if other instances are at same location
      const otherInstance = otherWorld.getEntity(entity.id);
      if (!otherInstance) continue;

      const otherPosition = otherInstance.getComponent<PositionComponent>(CT.Position);
      if (!otherPosition) continue;

      if (position.x === otherPosition.x && position.y === otherPosition.y) {
        // PARADOX! Same entity, same location, different timelines
        world.eventBus.emit({
          type: 'temporal:paradox_detected',
          data: {
            entityId: entity.id,
            timeline1: world.timelineId,
            timeline2: timelineId,
            location: { x: position.x, y: position.y },
          },
        });
      }
    }
  }
}
```

### Interactions with Technological Time Travel

Extra-temporal abilities interact interestingly with Chrono Zappers:

```typescript
/**
 * Key Differences:
 *
 * Chrono Zapper (Technological):
 * - Creates NEW timeline branch at destination
 * - Expensive (1M value per use, or 100M for infinite)
 * - One-way travel
 * - Requires game completion
 * - Anyone can use (with item)
 *
 * Extra-Temporal Jump (Genetic/Spiritual):
 * - Moves between EXISTING timelines
 * - Free or low mana/stamina cost
 * - Can maintain presence in multiple timelines
 * - May bypass game completion (for major/supreme)
 * - Species-restricted genetic trait
 */

/**
 * A Fae with a Chrono Zapper is particularly powerful:
 * - Can use natural ability to explore existing timelines
 * - Can use Chrono Zapper to CREATE new timeline branches
 * - Can maintain presence across all of them
 * - Becomes a true timeline architect
 */
function faeChronoZapperCombo(fae: Entity, zapper: ItemInstance, world: World): void {
  const temporal = fae.getComponent<ExtraTemporalComponent>(CT.ExtraTemporal);
  if (!temporal || temporal.temporalPower !== 'supreme') return;

  // Fae can use Chrono Zapper to CREATE new branches
  // Then use natural ability to freely move between ALL branches

  // This creates post-temporal civilizations where timeline branching
  // and exploration becomes a fundamental part of society
}
```

### Post-Temporal Society Dynamics

```typescript
/**
 * Post-Temporal Societies
 *
 * Civilizations where significant portions of the population
 * have extra-temporal abilities develop unique social structures:
 */
interface PostTemporalSociety {
  /** Species or civilization ID */
  societyId: string;

  /** Percentage of population with temporal abilities */
  temporalPopulationPercent: number;

  /** Average temporal power level */
  averageTemporalPower: 'minor' | 'major' | 'supreme';

  /** Social structures unique to temporal abilities */
  temporalFeatures: {
    /** Do they maintain family across timeline branches? */
    crossTimelineFamilies: boolean;

    /** Economic system across timelines */
    multiversalEconomy: boolean;

    /** Governance across timeline branches */
    crossTimelineGovernance: boolean;

    /** Cultural exchanges between timeline variants */
    timelineCulturalExchange: boolean;

    /** Wars fought across multiple timelines */
    temporalWarfare: boolean;
  };

  /** How do they view non-temporal species? */
  attitudeToTemporallyBound: 'pity' | 'superiority' | 'protection' | 'exploitation' | 'indifference';
}

/**
 * Example: Fae Court
 */
const FAE_COURT: PostTemporalSociety = {
  societyId: 'fae_court',
  temporalPopulationPercent: 100,  // All Fae are extra-temporal
  averageTemporalPower: 'supreme',
  temporalFeatures: {
    crossTimelineFamilies: true,  // Family exists across all branches
    multiversalEconomy: true,     // Trade across timelines
    crossTimelineGovernance: true, // Courts span all timelines
    timelineCulturalExchange: true,
    temporalWarfare: true,         // Battles across timeline branches
  },
  attitudeToTemporallyBound: 'pity',  // View linear beings as trapped
};
```

---

## Part 3: Belt Logistics System

**Design Philosophy: "Factorio-ish, not Full Factorio"**

For performance, belts use **count-based tracking** instead of individual item entities. Each belt segment holds a single resource type and tracks how many items are on it. This is much faster than tracking thousands of individual item positions.

### Belt Component

```typescript
/**
 * Conveyor belt - moves items in one direction
 *
 * SIMPLIFIED FOR PERFORMANCE:
 * - Tracks item COUNT, not individual positions
 * - Single resource type per belt (no splitters/combiners)
 * - Items propagate when transfer progress reaches 1.0
 * - Abstracted for performance - many systems coexist here
 */
interface BeltComponent extends Component {
  readonly type: 'belt';

  /** Direction belt moves items */
  direction: 'north' | 'south' | 'east' | 'west';

  /** Belt tier (affects speed) */
  tier: 1 | 2 | 3;

  /** Item type currently on this belt (null if empty) */
  itemId: string | null;

  /** Number of items on this belt segment */
  count: number;

  /** Maximum items per belt segment */
  capacity: number;

  /** Accumulated transfer progress (0.0 - 1.0) */
  transferProgress: number;
}

/**
 * Belt speeds by tier (tiles per tick)
 */
const BELT_SPEEDS = {
  1: 0.05,   // Wooden belt
  2: 0.15,   // Electric belt (3x faster)
  3: 0.30,   // Advanced belt (6x faster)
};
```

### BeltSystem

```typescript
/**
 * BeltSystem - Moves items along conveyors (count-based for performance)
 *
 * SIMPLIFIED APPROACH:
 * - Accumulates transfer progress based on belt tier speed
 * - When progress >= 1.0, transfers ONE item to next belt/machine
 * - Belts can only hold one resource type (no mixing)
 * - Much faster than tracking individual item positions
 */
class BeltSystem implements System {
  public readonly id: SystemId = 'belt';
  public readonly priority: number = 53;  // After PowerGridSystem
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Belt, CT.Position];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Step 1: Accumulate transfer progress
    for (const entity of entities) {
      const belt = (entity as EntityImpl).getComponent<BeltComponent>(CT.Belt);

      if (!belt || belt.count === 0) continue;

      const speed = BELT_SPEEDS[belt.tier] * deltaTime;
      belt.transferProgress += speed;
    }

    // Step 2: Transfer items to adjacent belts/machines
    for (const entity of entities) {
      const belt = (entity as EntityImpl).getComponent<BeltComponent>(CT.Belt);
      const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);

      if (!belt || !pos) continue;
      if (belt.count === 0 || belt.transferProgress < 1.0) continue;

      this.transferItems(belt, pos, world);
    }
  }

  /**
   * Transfer items to next belt/machine when progress >= 1.0
   */
  private transferItems(
    belt: BeltComponent,
    pos: PositionComponent,
    world: World
  ): void {
    if (!belt.itemId) return;

    // Find next belt/machine in direction
    const nextPos = this.getNextPosition(pos, belt.direction);
    const nextEntity = this.getEntityAt(world, nextPos);

    if (!nextEntity) {
      // No output - belt backs up (progress stays at 1.0)
      return;
    }

    // Try to transfer to next belt
    const nextBelt = (nextEntity as EntityImpl).getComponent<BeltComponent>(CT.Belt);
    if (nextBelt) {
      // Check if target can accept this resource type
      if (nextBelt.itemId !== null && nextBelt.itemId !== belt.itemId) {
        return; // Wrong resource type - belt backs up
      }

      if (nextBelt.count >= nextBelt.capacity) {
        return; // Full - belt backs up
      }

      // Transfer 1 item
      belt.count--;
      if (belt.count === 0) {
        belt.itemId = null;
      }

      if (nextBelt.itemId === null) {
        nextBelt.itemId = belt.itemId;
      }
      nextBelt.count++;

      // Reset transfer progress
      belt.transferProgress = 0.0;
      return;
    }

    // Try to transfer to machine input (handled by machine system integration)
    const machineConnection = (nextEntity as EntityImpl).getComponent<MachineConnectionComponent>(
      CT.MachineConnection
    );
    if (machineConnection) {
      // Find matching input slot (simplified - full implementation in code)
      // ...transfer logic...
      belt.transferProgress = 0.0;
    }
  }

  private getNextPosition(pos: PositionComponent, dir: string): { x: number; y: number } {
    switch (dir) {
      case 'north': return { x: pos.x, y: pos.y - 1 };
      case 'south': return { x: pos.x, y: pos.y + 1 };
      case 'east':  return { x: pos.x + 1, y: pos.y };
      case 'west':  return { x: pos.x - 1, y: pos.y };
      default: return pos;
    }
  }

  private getEntityAt(world: World, pos: { x: number; y: number }): Entity | null {
    const entities = world.query().with(CT.Position).executeEntities();
    return entities.find(e => {
      const p = (e as EntityImpl).getComponent<PositionComponent>(CT.Position);
      return p && Math.floor(p.x) === Math.floor(pos.x) && Math.floor(p.y) === Math.floor(pos.y);
    }) ?? null;
  }
}
```

### Belt Rendering (Visual Only)

Belts are **rendered** as having items on them for visual feedback, but the actual game logic only tracks counts. The renderer shows items flowing based on the `count` and `transferProgress` fields:

```typescript
/**
 * Renderer shows items on belts for visual feedback
 * This is PURELY COSMETIC - game logic uses counts only
 */
function renderBelt(belt: BeltComponent, pos: PositionComponent, ctx: CanvasRenderingContext2D): void {
  if (belt.count === 0 || !belt.itemId) return;

  // Visual only: distribute items evenly on belt
  const spacing = 1.0 / (belt.count + 1);
  for (let i = 0; i < belt.count; i++) {
    const visualProgress = (i + 1) * spacing;
    const offsetX = pos.x + (belt.direction === 'east' ? visualProgress : 0);
    const offsetY = pos.y + (belt.direction === 'south' ? visualProgress : 0);

    // Draw item sprite at position
    drawItemSprite(belt.itemId, offsetX, offsetY, ctx);
  }
}
```

### Direct Machine Connections

```typescript
/**
 * Machines can connect directly to adjacent machines without belts
 */
interface MachineConnectionComponent extends Component {
  readonly type: 'machine_connection';

  /** Input slots - accept items from adjacent outputs */
  inputs: MachineSlot[];

  /** Output slots - send items to adjacent inputs */
  outputs: MachineSlot[];
}

interface MachineSlot {
  /** Position relative to machine (e.g., {x: 0, y: -1} = north side) */
  offset: { x: number; y: number };

  /** Item filter (undefined = accept any) */
  filter?: string[];

  /** Current items in slot */
  items: ItemInstance[];

  /** Max stack size */
  capacity: number;
}

/**
 * DirectConnectionSystem - Transfers items between adjacent machines
 * Higher priority than BeltSystem to prefer direct transfers
 */
class DirectConnectionSystem implements System {
  public readonly id: SystemId = 'direct_connection';
  public readonly priority: number = 52;  // Before BeltSystem

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const connection = (entity as EntityImpl).getComponent<MachineConnectionComponent>(
        CT.MachineConnection
      );
      const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);

      if (!connection || !pos) continue;

      // Try to output items to adjacent machines
      for (const output of connection.outputs) {
        this.tryTransferOutput(entity, output, pos, world);
      }
    }
  }

  private tryTransferOutput(
    source: Entity,
    output: MachineSlot,
    sourcePos: PositionComponent,
    world: World
  ): void {
    if (output.items.length === 0) return;

    // Find adjacent machine at output position
    const targetPos = {
      x: sourcePos.x + output.offset.x,
      y: sourcePos.y + output.offset.y,
    };

    const target = this.getEntityAt(world, targetPos);
    if (!target) return;

    const targetConnection = (target as EntityImpl).getComponent<MachineConnectionComponent>(
      CT.MachineConnection
    );
    if (!targetConnection) return;

    // Find matching input slot on target
    for (const input of targetConnection.inputs) {
      // Check if this input faces our output
      const inputWorldPos = {
        x: targetPos.x + input.offset.x,
        y: targetPos.y + input.offset.y,
      };

      if (inputWorldPos.x !== sourcePos.x || inputWorldPos.y !== sourcePos.y) continue;

      // Check filter
      const itemToTransfer = output.items[0];
      if (input.filter && !input.filter.includes(itemToTransfer.definitionId)) continue;

      // Check capacity
      if (input.items.length >= input.capacity) continue;

      // Transfer item
      input.items.push(output.items.shift()!);
      break;
    }
  }

  private getEntityAt(world: World, pos: { x: number; y: number }): Entity | null {
    const entities = world.query().with(CT.Position).executeEntities();
    return entities.find(e => {
      const p = (e as EntityImpl).getComponent<PositionComponent>(CT.Position);
      return p && p.x === pos.x && p.y === pos.y;
    }) ?? null;
  }
}
```

---

## Part 4: Automated Production

### Assembly Machine Component

```typescript
/**
 * Assembly machine - automatically crafts recipes
 */
interface AssemblyMachineComponent extends Component {
  readonly type: 'assembly_machine';

  /** Current recipe being crafted (undefined = idle) */
  currentRecipe?: string;

  /** Crafting progress (0-100) */
  progress: number;

  /** Speed multiplier (base 1.0) */
  speed: number;

  /** Max ingredient slots */
  ingredientSlots: number;

  /** Modules installed (speed/efficiency) */
  modules: ModuleInstance[];
}

interface ModuleInstance {
  moduleType: 'speed' | 'efficiency' | 'productivity';
  level: 1 | 2 | 3;
  bonus: number;  // E.g., 0.2 = +20%
}
```

### AssemblyMachineSystem

```typescript
/**
 * AssemblyMachineSystem - Auto-crafts recipes using inputs
 */
class AssemblyMachineSystem implements System {
  public readonly id: SystemId = 'assembly_machine';
  public readonly priority: number = 54;  // After power/logistics

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const machine = (entity as EntityImpl).getComponent<AssemblyMachineComponent>(
        CT.AssemblyMachine
      );
      const connection = (entity as EntityImpl).getComponent<MachineConnectionComponent>(
        CT.MachineConnection
      );
      const power = (entity as EntityImpl).getComponent<PowerComponent>(CT.Power);

      if (!machine || !connection) continue;

      // Skip if not powered
      if (power && !power.isPowered) continue;

      // If no recipe set, agent needs to configure
      if (!machine.currentRecipe) continue;

      // Check if we have ingredients
      const recipe = world.recipeRegistry.tryGet(machine.currentRecipe);
      if (!recipe) continue;

      const hasIngredients = this.checkIngredients(recipe, connection.inputs);
      if (!hasIngredients) continue;

      // Apply power efficiency to speed
      const efficiencyMod = power?.efficiency ?? 1.0;
      const speedMod = this.calculateSpeedModifier(machine);

      // Craft
      const progressDelta = (deltaTime / recipe.craftingTime) * speedMod * efficiencyMod;
      machine.progress += progressDelta * 100;

      if (machine.progress >= 100) {
        // Consume ingredients
        this.consumeIngredients(recipe, connection.inputs);

        // Produce output
        this.produceOutput(recipe, connection.outputs, world);

        // Reset progress
        machine.progress = 0;
      }
    }
  }

  private checkIngredients(
    recipe: Recipe,
    inputs: MachineSlot[]
  ): boolean {
    for (const ingredient of recipe.inputs) {
      const totalAvailable = inputs.reduce((sum, slot) => {
        return sum + slot.items.filter(i => i.definitionId === ingredient.itemId).length;
      }, 0);

      if (totalAvailable < ingredient.amount) return false;
    }

    return true;
  }

  private consumeIngredients(recipe: Recipe, inputs: MachineSlot[]): void {
    for (const ingredient of recipe.inputs) {
      let remaining = ingredient.amount;

      for (const slot of inputs) {
        while (remaining > 0 && slot.items.length > 0) {
          const item = slot.items.find(i => i.definitionId === ingredient.itemId);
          if (!item) continue;

          slot.items = slot.items.filter(i => i.instanceId !== item.instanceId);
          remaining--;
        }

        if (remaining === 0) break;
      }
    }
  }

  private produceOutput(
    recipe: Recipe,
    outputs: MachineSlot[],
    world: World
  ): void {
    for (const output of recipe.outputs) {
      for (let i = 0; i < output.amount; i++) {
        const item = world.itemInstanceRegistry.createInstance(output.itemId, {
          quality: 'normal',
        });

        // Find available output slot
        const slot = outputs.find(s => s.items.length < s.capacity);
        if (!slot) {
          // Output blocked - item lost (or halt production)
          continue;
        }

        slot.items.push(item);
      }
    }
  }

  private calculateSpeedModifier(machine: AssemblyMachineComponent): number {
    let speed = machine.speed;

    for (const module of machine.modules) {
      if (module.moduleType === 'speed') {
        speed *= (1 + module.bonus);
      }
    }

    return speed;
  }
}
```

---

## Part 5: Abstracted Logistics Network (Tier 4)

**Design Philosophy: Performance Over Realism**

Factorio suffered from "flying robot syndrome" - tracking thousands of individual robot entities was expensive and allowed players to shoot them down. For performance in a game with many coexisting systems, we use **abstracted "in transit" tracking** instead.

Logistics drones are **too fast to see** - they're assumed to exist but not simulated as entities. Items have an "in transit" status with a calculated delivery time based on distance, weight, and network upgrades.

**Key Benefits:**
- No individual robot entities to track (massive performance gain)
- Agents can't shoot down logistics (keeps it simple)
- Works for both ground-based and flying agents
- Upgrades affect transit time calculations, not physical speed

**Agent Accessibility:**
- Most agents **can't fly**, so they need ground-accessible logistics
- Factory layouts must consider agent movement and reachability
- Flying agents (if they exist) would have different factory layouts with aerial connections

### Logistics Network Components

```typescript
/**
 * LogisticsHub - Manages logistics network and transit calculations
 * Replaces roboports + individual robot tracking
 */
interface LogisticsHubComponent extends Component {
  readonly type: 'logistics_hub';

  /** Logistics coverage radius */
  range: number;

  /** Network tier (affects transit speed) */
  tier: 1 | 2 | 3;

  /** Power consumption (kW) */
  powerConsumption: number;

  /** Is hub powered and active */
  isActive: boolean;

  /** Logistics network ID (connected hubs share network) */
  networkId: string;
}

/**
 * LogisticsChest - Request, provide, or store items
 * NO ROBOT ENTITIES - items are marked "in transit" with calculated delivery time
 */
interface LogisticsChestComponent extends Component {
  readonly type: 'logistics_chest';

  chestType: 'provider' | 'requester' | 'storage' | 'buffer';

  /** Items currently in chest */
  inventory: InventoryComponent;

  /** For requester chests: what items to request */
  requests?: Map<string, number>;  // itemId → desired amount

  /** Items in transit TO this chest */
  incomingTransit: TransitItem[];

  /** Items in transit FROM this chest */
  outgoingTransit: TransitItem[];

  /** Logistics network this chest belongs to */
  networkId?: string;
}

/**
 * Items "in transit" - abstracted delivery without robot entities
 */
interface TransitItem {
  /** What item is being delivered */
  itemId: string;

  /** How many items */
  amount: number;

  /** Source chest entity ID */
  fromChestId: string;

  /** Destination chest entity ID */
  toChestId: string;

  /** When will delivery complete (game tick) */
  arrivalTick: number;

  /** Priority (higher = delivered first) */
  priority: number;
}
```

### AbstractedLogisticsSystem

```typescript
/**
 * AbstractedLogisticsSystem - Manages "in transit" items without robot entities
 *
 * SIMPLIFIED FOR PERFORMANCE:
 * - No individual robot entities to track
 * - Items are marked "in transit" with calculated delivery time
 * - Transit time based on distance, item weight, and network tier
 * - Agents can't interact with logistics (too fast to see)
 */
class AbstractedLogisticsSystem implements System {
  public readonly id: SystemId = 'abstracted_logistics';
  public readonly priority: number = 55;  // After assembly machines

  // Transit speed by network tier (tiles per second)
  private readonly TRANSIT_SPEEDS = {
    1: 10,   // Basic logistics: 10 tiles/sec
    2: 25,   // Advanced logistics: 25 tiles/sec (2.5x faster)
    3: 50,   // Quantum logistics: 50 tiles/sec (5x faster)
  };

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Step 1: Process arrivals (items that reached destination)
    this.processArrivals(world);

    // Step 2: Generate new delivery requests
    this.generateDeliveries(world);
  }

  /**
   * Process items that have arrived at their destination
   */
  private processArrivals(world: World): void {
    const chests = world.query()
      .with(CT.LogisticsChest)
      .executeEntities();

    const currentTick = world.getCurrentTick();

    for (const chest of chests) {
      const logistics = (chest as EntityImpl).getComponent<LogisticsChestComponent>(CT.LogisticsChest);
      if (!logistics) continue;

      // Find items that have arrived
      const arrivedItems = logistics.incomingTransit.filter(
        transit => transit.arrivalTick <= currentTick
      );

      for (const transit of arrivedItems) {
        // Add items to chest inventory
        addToInventory(logistics.inventory, transit.itemId, transit.amount);

        // Remove from transit
        logistics.incomingTransit = logistics.incomingTransit.filter(
          t => t !== transit
        );
      }
    }
  }

  /**
   * Generate new delivery requests based on requester/provider chests
   */
  private generateDeliveries(world: World): void {
    // Build logistics networks (hubs with overlapping range)
    const networks = this.buildLogisticsNetworks(world);

    for (const network of networks) {
      this.processNetwork(network, world);
    }
  }

  /**
   * Process a single logistics network
   */
  private processNetwork(network: LogisticsNetwork, world: World): void {
    // Find all requesters that need items
    for (const requesterEntity of network.chests) {
      const requester = (requesterEntity as EntityImpl).getComponent<LogisticsChestComponent>(
        CT.LogisticsChest
      );

      if (!requester || requester.chestType !== 'requester') continue;
      if (!requester.requests) continue;

      for (const [itemId, requestedAmount] of requester.requests) {
        const currentAmount = getItemCount(requester.inventory, itemId);
        const inTransit = this.getInTransitAmount(requester.incomingTransit, itemId);
        const needed = requestedAmount - currentAmount - inTransit;

        if (needed <= 0) continue;

        // Find provider with this item
        const provider = this.findProvider(network, itemId, world);
        if (!provider) continue;

        // Calculate transit time
        const requesterPos = (requesterEntity as EntityImpl).getComponent<PositionComponent>(CT.Position);
        const providerEntity = world.getEntity(provider.entityId);
        const providerPos = (providerEntity as EntityImpl).getComponent<PositionComponent>(CT.Position);

        if (!requesterPos || !providerPos) continue;

        const distance = Math.sqrt(
          (requesterPos.x - providerPos.x) ** 2 +
          (requesterPos.y - providerPos.y) ** 2
        );

        // Calculate delivery time based on network tier
        const transitSpeed = this.TRANSIT_SPEEDS[network.tier];
        const transitTimeSeconds = distance / transitSpeed;
        const transitTimeTicks = Math.ceil(transitTimeSeconds * 20); // 20 ticks/sec

        // Item weight affects transit time (optional enhancement)
        const itemWeight = world.itemRegistry.getWeight(itemId) ?? 1.0;
        const weightModifier = 1.0 + (itemWeight - 1.0) * 0.5; // Heavier = slower
        const finalTransitTicks = Math.ceil(transitTimeTicks * weightModifier);

        // Create transit entry
        const transit: TransitItem = {
          itemId,
          amount: Math.min(needed, provider.available),
          fromChestId: provider.entityId,
          toChestId: requesterEntity.id,
          arrivalTick: world.getCurrentTick() + finalTransitTicks,
          priority: 0,
        };

        // Remove from provider inventory
        removeFromInventory(provider.chest.inventory, itemId, transit.amount);

        // Add to transit tracking
        provider.chest.outgoingTransit.push(transit);
        requester.incomingTransit.push(transit);
      }
    }
  }

  /**
   * Build logistics networks from connected hubs
   */
  private buildLogisticsNetworks(world: World): LogisticsNetwork[] {
    const hubs = world.query()
      .with(CT.LogisticsHub)
      .with(CT.Position)
      .executeEntities();

    const networks: LogisticsNetwork[] = [];
    const networkMap = new Map<string, LogisticsNetwork>();

    for (const hub of hubs) {
      const hubComponent = (hub as EntityImpl).getComponent<LogisticsHubComponent>(CT.LogisticsHub);
      const pos = (hub as EntityImpl).getComponent<PositionComponent>(CT.Position);

      if (!hubComponent || !pos || !hubComponent.isActive) continue;

      // Get or create network
      let network = networkMap.get(hubComponent.networkId);
      if (!network) {
        network = {
          id: hubComponent.networkId,
          tier: hubComponent.tier,
          hubs: [],
          chests: [],
        };
        networkMap.set(hubComponent.networkId, network);
        networks.push(network);
      }

      network.hubs.push(hub);

      // Find chests in range of this hub
      const chests = world.query()
        .with(CT.LogisticsChest)
        .with(CT.Position)
        .executeEntities();

      for (const chest of chests) {
        const chestPos = (chest as EntityImpl).getComponent<PositionComponent>(CT.Position);
        if (!chestPos) continue;

        const dx = pos.x - chestPos.x;
        const dy = pos.y - chestPos.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= hubComponent.range * hubComponent.range) {
          // Mark chest as part of this network
          const chestComponent = (chest as EntityImpl).getComponent<LogisticsChestComponent>(
            CT.LogisticsChest
          );
          if (chestComponent) {
            chestComponent.networkId = hubComponent.networkId;
          }

          if (!network.chests.includes(chest)) {
            network.chests.push(chest);
          }
        }
      }
    }

    return networks;
  }

  /**
   * Find provider chest with available item in network
   */
  private findProvider(
    network: LogisticsNetwork,
    itemId: string,
    world: World
  ): { entityId: string; chest: LogisticsChestComponent; available: number } | null {
    for (const chest of network.chests) {
      const logistics = (chest as EntityImpl).getComponent<LogisticsChestComponent>(
        CT.LogisticsChest
      );

      if (!logistics) continue;
      if (logistics.chestType !== 'provider' && logistics.chestType !== 'storage') continue;

      const available = getItemCount(logistics.inventory, itemId);
      if (available > 0) {
        return {
          entityId: chest.id,
          chest: logistics,
          available,
        };
      }
    }

    return null;
  }

  /**
   * Get amount of items in transit to chest
   */
  private getInTransitAmount(transitItems: TransitItem[], itemId: string): number {
    return transitItems
      .filter(t => t.itemId === itemId)
      .reduce((sum, t) => sum + t.amount, 0);
  }
}

interface LogisticsNetwork {
  id: string;
  tier: 1 | 2 | 3;
  hubs: Entity[];
  chests: Entity[];
}
```

### Example: Transit Time Calculation

```typescript
/**
 * Example: Requester chest wants 500 iron ore
 *
 * Instead of spawning robots:
 * 1. Find provider with iron ore
 * 2. Calculate distance: 50 tiles
 * 3. Network tier 2: 25 tiles/sec
 * 4. Transit time: 50 / 25 = 2 seconds = 40 ticks
 * 5. Iron ore weight: 2.0 (heavy)
 * 6. Weight modifier: 1.0 + (2.0 - 1.0) * 0.5 = 1.5x
 * 7. Final transit time: 40 * 1.5 = 60 ticks
 * 8. Create TransitItem with arrivalTick = currentTick + 60
 * 9. Remove 500 iron from provider inventory
 * 10. After 60 ticks, add 500 iron to requester inventory
 *
 * NO ROBOTS SIMULATED! Just math and timers.
 */
```

---

## Part 6: Research Tree Definitions

### Logistics Research Branch

```typescript
/**
 * TIER 2: Basic Transport
 */
export const LOGISTICS_I = defineResearch(
  'logistics_i',
  'Basic Transport',
  'Learn to build simple conveyor belts and chutes for moving items.',
  'logistics',
  2,
  {
    progressRequired: 150,
    prerequisites: ['construction_i', 'crafting_i'],
    unlocks: [
      { type: 'building', buildingId: 'conveyor_belt' },
      { type: 'building', buildingId: 'wooden_chute' },
      { type: 'recipe', recipeId: 'belt_segment' },
      { type: 'knowledge', knowledgeId: 'direct_connection' },
    ],
  }
);

/**
 * TIER 3: Powered Transport
 */
export const LOGISTICS_II = defineResearch(
  'logistics_ii',
  'Powered Transport',
  'Electrify your logistics with faster belts and smart routing.',
  'logistics',
  3,
  {
    progressRequired: 300,
    prerequisites: ['logistics_i', 'production_i', 'metallurgy_i'],
    unlocks: [
      { type: 'building', buildingId: 'electric_belt' },
      { type: 'building', buildingId: 'item_filter' },
      { type: 'building', buildingId: 'belt_junction' },
      { type: 'building', buildingId: 'power_pole' },
      { type: 'recipe', recipeId: 'copper_wire' },
    ],
  }
);

/**
 * TIER 5: Dimensional Logistics (Endgame)
 */
export const LOGISTICS_III = defineResearch(
  'logistics_iii',
  'Dimensional Logistics',
  'Teleportation networks and dimensional storage for ultimate logistics.',
  'logistics',
  5,
  {
    progressRequired: 900,
    prerequisites: ['logistics_ii', 'robotics_ii', 'arcane_studies'],
    unlocks: [
      { type: 'building', buildingId: 'teleport_pad' },
      { type: 'building', buildingId: 'dimensional_chest' },
      { type: 'building', buildingId: 'matter_stream' },
      { type: 'ability', abilityId: 'logistics_overlay' },
      { type: 'recipe', recipeId: 'spatial_anchor' },
    ],
  }
);
```

### Production Research Branch

```typescript
/**
 * TIER 2: Mechanical Automation
 */
export const PRODUCTION_I = defineResearch(
  'production_i',
  'Mechanical Automation',
  'Build machines powered by wind and water to automate simple crafting.',
  'production',
  2,
  {
    progressRequired: 200,
    prerequisites: ['machinery_i', 'crafting_i'],
    unlocks: [
      { type: 'building', buildingId: 'mechanical_crafter' },
      { type: 'building', buildingId: 'mill_grinder' },
      { type: 'building', buildingId: 'mechanical_saw' },
      { type: 'recipe', recipeId: 'gear_assembly' },
      { type: 'knowledge', knowledgeId: 'power_transmission' },
    ],
  }
);

/**
 * TIER 3: Electric Factories
 */
export const PRODUCTION_II = defineResearch(
  'production_ii',
  'Electric Factories',
  'Build powered factories that handle complex multi-ingredient recipes.',
  'production',
  3,
  {
    progressRequired: 350,
    prerequisites: ['production_i', 'metallurgy_ii'],
    unlocks: [
      { type: 'building', buildingId: 'electric_furnace' },
      { type: 'building', buildingId: 'assembly_machine_i' },
      { type: 'building', buildingId: 'electric_pump' },
      { type: 'building', buildingId: 'coal_generator' },
      { type: 'recipe', recipeId: 'electric_motor' },
    ],
  }
);

/**
 * TIER 4: Mass Production
 */
export const PRODUCTION_III = defineResearch(
  'production_iii',
  'Mass Production',
  'Massive factories with speed modules and productivity bonuses.',
  'production',
  4,
  {
    progressRequired: 500,
    prerequisites: ['production_ii', 'robotics_i'],
    unlocks: [
      { type: 'building', buildingId: 'assembly_machine_ii' },
      { type: 'building', buildingId: 'oil_refinery' },
      { type: 'item', itemId: 'speed_module_i' },
      { type: 'item', itemId: 'efficiency_module_i' },
      { type: 'recipe', recipeId: 'advanced_circuit' },
    ],
  }
);

/**
 * TIER 5: Arcane Manufacturing
 */
export const PRODUCTION_IV = defineResearch(
  'production_iv',
  'Arcane Manufacturing',
  'Fusion of magic and machinery - instantaneous crafting and matter transformation.',
  'production',
  5,
  {
    progressRequired: 1000,
    prerequisites: ['production_iii', 'arcane_studies', 'experimental_research'],
    unlocks: [
      { type: 'building', buildingId: 'matter_transmuter' },
      { type: 'building', buildingId: 'assembly_machine_iii' },
      { type: 'building', buildingId: 'ley_generator' },
      { type: 'item', itemId: 'transmutation_core' },
      { type: 'recipe', recipeId: 'philosopher_stone' },
    ],
  }
);
```

### Robotics Research Branch

```typescript
/**
 * TIER 4: Construction Automation
 */
export const ROBOTICS_I = defineResearch(
  'robotics_i',
  'Construction Automation',
  'Build robots that construct buildings automatically from blueprints.',
  'robotics',
  4,
  {
    progressRequired: 400,
    prerequisites: ['production_ii', 'logistics_ii', 'metallurgy_ii'],
    unlocks: [
      { type: 'building', buildingId: 'roboport' },
      { type: 'item', itemId: 'construction_robot' },
      { type: 'building', buildingId: 'robot_assembly' },
      { type: 'recipe', recipeId: 'robot_frame' },
      { type: 'ability', abilityId: 'create_blueprint' },
    ],
  }
);

/**
 * TIER 4: Logistics Automation (THIS REPLACES BELTS)
 */
export const ROBOTICS_II = defineResearch(
  'robotics_ii',
  'Logistics Automation',
  'Deploy logistics robots that move items between machines and storage automatically.',
  'robotics',
  4,
  {
    progressRequired: 450,
    prerequisites: ['robotics_i'],
    unlocks: [
      { type: 'item', itemId: 'logistics_robot' },
      { type: 'building', buildingId: 'smart_chest_requester' },
      { type: 'building', buildingId: 'smart_chest_provider' },
      { type: 'building', buildingId: 'smart_chest_storage' },
      { type: 'recipe', recipeId: 'logistics_chip' },
    ],
  }
);

/**
 * TIER 5: Swarm Intelligence
 */
export const ROBOTICS_III = defineResearch(
  'robotics_iii',
  'Swarm Intelligence',
  'Advanced robots with AI that optimize factory layouts autonomously.',
  'robotics',
  5,
  {
    progressRequired: 800,
    prerequisites: ['robotics_ii', 'arcane_studies'],
    unlocks: [
      { type: 'building', buildingId: 'mega_roboport' },
      { type: 'item', itemId: 'optimizer_robot' },
      { type: 'item', itemId: 'arcane_robot' },
      { type: 'ability', abilityId: 'factory_analysis' },
      { type: 'recipe', recipeId: 'quantum_chip' },
    ],
  }
);
```

---

## Part 7: Item Definitions

### Automation Items

```typescript
/**
 * Belt items
 */
export const BELT_ITEMS: ItemDefinition[] = [
  defineItem('belt_segment', 'Belt Segment', 'material', {
    weight: 1.0,
    stackSize: 100,
    baseMaterial: 'wood',
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'fiber', amount: 1 },
    ],
    baseValue: 5,
    rarity: 'common',
    help: {
      summary: 'Wooden belt components used to build conveyor systems.',
      description: 'A segment of belt made from wood and fiber. Cheap to produce and essential for early automation. Won\'t win any speed records, but it beats carrying things manually.',
    },
  }),

  defineItem('copper_wire', 'Copper Wire', 'material', {
    weight: 0.1,
    stackSize: 200,
    baseMaterial: 'copper',
    craftedFrom: [
      { itemId: 'copper_ingot', amount: 1 },
    ],
    baseValue: 3,
    rarity: 'common',
    help: {
      summary: 'Conductive wire for electrical systems and power distribution.',
    },
  }),
];

/**
 * Robot items
 */
export const ROBOT_ITEMS: ItemDefinition[] = [
  defineItem('robot_frame', 'Robot Frame', 'material', {
    weight: 5.0,
    stackSize: 10,
    baseMaterial: 'steel',
    craftedFrom: [
      { itemId: 'steel_ingot', amount: 3 },
      { itemId: 'copper_wire', amount: 5 },
      { itemId: 'gear_assembly', amount: 2 },
    ],
    baseValue: 50,
    rarity: 'uncommon',
    help: {
      summary: 'Structural frame for construction and logistics robots.',
      description: 'A lightweight steel frame that forms the skeleton of autonomous robots. Precision-engineered to balance strength, weight, and flight capability. Costs more than manual labor short-term, pays for itself long-term.',
    },
  }),

  defineItem('construction_robot', 'Construction Robot', 'equipment', {
    weight: 8.0,
    stackSize: 5,
    baseMaterial: 'steel',
    craftedFrom: [
      { itemId: 'robot_frame', amount: 1 },
      { itemId: 'electric_motor', amount: 2 },
      { itemId: 'advanced_circuit', amount: 1 },
    ],
    baseValue: 150,
    rarity: 'rare',
    help: {
      summary: 'Autonomous flying robot that constructs buildings from blueprints.',
      description: 'A construction robot that builds structures based on blueprints you provide. Give it materials and a plan, and it handles the tedious part. Stores in roboports when not working, recharges automatically, and never complains about working conditions.',
    },
  }),

  defineItem('logistics_robot', 'Logistics Robot', 'equipment', {
    weight: 7.0,
    stackSize: 5,
    baseMaterial: 'steel',
    craftedFrom: [
      { itemId: 'robot_frame', amount: 1 },
      { itemId: 'electric_motor', amount: 2 },
      { itemId: 'logistics_chip', amount: 1 },
    ],
    baseValue: 160,
    rarity: 'rare',
    help: {
      summary: 'Autonomous flying robot that transports items between machines and storage.',
      description: 'A logistics robot that moves items where they\'re needed. Works within roboport range, fetching from provider chests and delivering to requester chests. This is where you stop using belts and start living in the future.',
    },
  }),
];

/**
 * Module items
 */
export const MODULE_ITEMS: ItemDefinition[] = [
  defineItem('speed_module_i', 'Speed Module I', 'equipment', {
    weight: 2.0,
    stackSize: 10,
    craftedFrom: [
      { itemId: 'advanced_circuit', amount: 2 },
      { itemId: 'copper_wire', amount: 10 },
    ],
    baseValue: 80,
    rarity: 'rare',
    help: {
      summary: 'Module that increases machine speed by 20% at the cost of +20% power consumption.',
      description: 'A speed module that makes machines work faster. The trade-off is increased power draw—physics doesn\'t let you get something for nothing. Insert into assembly machines, furnaces, or any production building with module slots.',
    },
  }),

  defineItem('efficiency_module_i', 'Efficiency Module I', 'equipment', {
    weight: 2.0,
    stackSize: 10,
    craftedFrom: [
      { itemId: 'advanced_circuit', amount: 2 },
      { itemId: 'copper_wire', amount: 10 },
    ],
    baseValue: 80,
    rarity: 'rare',
    help: {
      summary: 'Module that reduces machine power consumption by 20%.',
      description: 'An efficiency module that reduces power consumption. Useful when your power grid is stretched thin and you\'re not ready to build another generator yet. Helps sustainability-minded engineers sleep at night.',
    },
  }),
];
```

---

## Part 8: Building Blueprints

### Belt Buildings

```typescript
/**
 * Conveyor Belt (Tier 1)
 */
export const CONVEYOR_BELT = defineBuildingBlueprint({
  id: 'conveyor_belt',
  name: 'Conveyor Belt',
  description: 'Moves items in one direction. Slow but cheap.',
  cost: [
    { itemId: 'belt_segment', amount: 2 },
  ],
  buildTime: 10,
  size: { width: 1, height: 1 },
  functionality: [
    {
      type: 'belt',
      tier: 1,
      speed: 0.05,  // tiles/tick
      capacity: 4,  // items per segment
    },
  ],
  requiredResearch: 'logistics_i',
  help: {
    summary: 'Basic wooden conveyor that moves items slowly but reliably.',
    description: 'Your first step into automation. Place these to create item transport routes between machines. They\'re slow—about as fast as a careful walk—but they work 24/7 without complaint. Rotate with R to change direction.',
  },
});

/**
 * Electric Belt (Tier 2)
 */
export const ELECTRIC_BELT = defineBuildingBlueprint({
  id: 'electric_belt',
  name: 'Electric Belt',
  description: '3x faster than wooden belts. Requires power.',
  cost: [
    { itemId: 'steel_ingot', amount: 1 },
    { itemId: 'copper_wire', amount: 2 },
  ],
  buildTime: 15,
  size: { width: 1, height: 1 },
  functionality: [
    {
      type: 'belt',
      tier: 2,
      speed: 0.15,
      capacity: 6,
    },
    {
      type: 'power_consumption',
      powerType: 'electrical',
      consumption: 5,  // 5 kW
    },
  ],
  requiredResearch: 'logistics_ii',
});
```

### Assembly Machines

```typescript
/**
 * Mechanical Crafter (Tier 2)
 */
export const MECHANICAL_CRAFTER = defineBuildingBlueprint({
  id: 'mechanical_crafter',
  name: 'Mechanical Crafter',
  description: 'Auto-crafts 1-2 ingredient recipes using mechanical power.',
  cost: [
    { itemId: 'wood', amount: 20 },
    { itemId: 'stone', amount: 15 },
    { itemId: 'gear_assembly', amount: 5 },
  ],
  buildTime: 80,
  size: { width: 2, height: 2 },
  functionality: [
    {
      type: 'assembly_machine',
      speed: 0.5,  // 50% of normal craft speed
      ingredientSlots: 2,
      moduleSlots: 0,
    },
    {
      type: 'power_consumption',
      powerType: 'mechanical',
      consumption: 25,  // 25 kW from nearby windmill/water wheel
    },
    {
      type: 'machine_connection',
      inputs: [
        { offset: { x: 0, y: -1 }, capacity: 10 },  // North side
      ],
      outputs: [
        { offset: { x: 0, y: 1 }, capacity: 10 },   // South side
      ],
    },
  ],
  requiredResearch: 'production_i',
  help: {
    summary: 'Basic automated crafter powered by wind or water.',
    description: 'Your first automated production machine. Set a recipe via UI, ensure it has power from a nearby windmill or water wheel, and it will craft forever. Slower than manual crafting but runs while you do other things. Connect inputs/outputs directly to adjacent machines or use belts.',
  },
});

/**
 * Assembly Machine I (Tier 3)
 */
export const ASSEMBLY_MACHINE_I = defineBuildingBlueprint({
  id: 'assembly_machine_i',
  name: 'Assembly Machine I',
  description: 'Electric assembly machine. Handles recipes with up to 4 ingredients.',
  cost: [
    { itemId: 'iron_ingot', amount: 15 },
    { itemId: 'copper_wire', amount: 10 },
    { itemId: 'gear_assembly', amount: 8 },
  ],
  buildTime: 120,
  size: { width: 3, height: 3 },
  functionality: [
    {
      type: 'assembly_machine',
      speed: 1.0,  // Normal craft speed
      ingredientSlots: 4,
      moduleSlots: 2,
    },
    {
      type: 'power_consumption',
      powerType: 'electrical',
      consumption: 50,  // 50 kW
    },
    {
      type: 'machine_connection',
      inputs: [
        { offset: { x: -1, y: 0 }, capacity: 20 },  // West
        { offset: { x: 0, y: -1 }, capacity: 20 },  // North
      ],
      outputs: [
        { offset: { x: 1, y: 0 }, capacity: 20 },   // East
        { offset: { x: 0, y: 1 }, capacity: 20 },   // South
      ],
    },
  ],
  requiredResearch: 'production_ii',
});

/**
 * Assembly Machine II (Tier 4)
 */
export const ASSEMBLY_MACHINE_II = defineBuildingBlueprint({
  id: 'assembly_machine_ii',
  name: 'Assembly Machine II',
  description: '2x faster than Assembly Machine I. 6 ingredient slots.',
  cost: [
    { itemId: 'steel_ingot', amount: 20 },
    { itemId: 'electric_motor', amount: 5 },
    { itemId: 'advanced_circuit', amount: 3 },
  ],
  buildTime: 180,
  size: { width: 3, height: 3 },
  functionality: [
    {
      type: 'assembly_machine',
      speed: 2.0,  // 2x speed
      ingredientSlots: 6,
      moduleSlots: 4,
    },
    {
      type: 'power_consumption',
      powerType: 'electrical',
      consumption: 150,  // 150 kW
    },
    {
      type: 'machine_connection',
      inputs: [
        { offset: { x: -1, y: 0 }, capacity: 30 },
        { offset: { x: 0, y: -1 }, capacity: 30 },
      ],
      outputs: [
        { offset: { x: 1, y: 0 }, capacity: 30 },
        { offset: { x: 0, y: 1 }, capacity: 30 },
      ],
    },
  ],
  requiredResearch: 'production_iii',
});
```

### Roboport & Logistics Chests

```typescript
/**
 * Roboport (Tier 4)
 */
export const ROBOPORT = defineBuildingBlueprint({
  id: 'roboport',
  name: 'Roboport',
  description: 'Hub for construction and logistics robots. 20-tile range.',
  cost: [
    { itemId: 'steel_ingot', amount: 30 },
    { itemId: 'advanced_circuit', amount: 10 },
    { itemId: 'copper_wire', amount: 50 },
  ],
  buildTime: 200,
  size: { width: 4, height: 4 },
  functionality: [
    {
      type: 'roboport',
      range: 20,
      capacity: 50,  // robots
      rechargeRate: 5,  // battery % per tick
    },
    {
      type: 'power_consumption',
      powerType: 'electrical',
      consumption: 100,  // 100 kW
    },
    {
      type: 'storage',  // For storing robot materials
      capacity: 100,
    },
  ],
  requiredResearch: 'robotics_i',
  help: {
    summary: 'Central hub for autonomous robot operations.',
    description: 'The roboport is the heart of robotic automation. Stores robots, recharges them, and manages logistics within 20 tiles. Construction robots build from blueprints, logistics robots move items between provider/requester chests. This is where manual item movement ends.',
  },
});

/**
 * Requester Chest (Tier 4)
 */
export const REQUESTER_CHEST = defineBuildingBlueprint({
  id: 'smart_chest_requester',
  name: 'Requester Chest',
  description: 'Requests specific items from the logistics network.',
  cost: [
    { itemId: 'steel_ingot', amount: 5 },
    { itemId: 'logistics_chip', amount: 1 },
  ],
  buildTime: 30,
  size: { width: 1, height: 1 },
  functionality: [
    {
      type: 'logistics_chest',
      chestType: 'requester',
    },
    {
      type: 'storage',
      capacity: 50,
    },
  ],
  requiredResearch: 'robotics_ii',
  help: {
    summary: 'Logistics chest that requests items from providers.',
    description: 'Set what items you want and how many. Logistics robots will fetch them from provider/storage chests and deliver them here. Perfect for feeding assembly machines without belts.',
  },
});

/**
 * Provider Chest (Tier 4)
 */
export const PROVIDER_CHEST = defineBuildingBlueprint({
  id: 'smart_chest_provider',
  name: 'Provider Chest',
  description: 'Provides items to the logistics network.',
  cost: [
    { itemId: 'steel_ingot', amount: 5 },
    { itemId: 'logistics_chip', amount: 1 },
  ],
  buildTime: 30,
  size: { width: 1, height: 1 },
  functionality: [
    {
      type: 'logistics_chest',
      chestType: 'provider',
    },
    {
      type: 'storage',
      capacity: 50,
    },
  ],
  requiredResearch: 'robotics_ii',
  help: {
    summary: 'Logistics chest that provides items to requesters.',
    description: 'Items stored here are available to the logistics network. Robots will take from this chest when requesters need them. Great for storing production outputs.',
  },
});

/**
 * Storage Chest (Tier 4)
 */
export const STORAGE_CHEST = defineBuildingBlueprint({
  id: 'smart_chest_storage',
  name: 'Storage Chest',
  description: 'Stores overflow items from the logistics network.',
  cost: [
    { itemId: 'steel_ingot', amount: 5 },
    { itemId: 'logistics_chip', amount: 1 },
  ],
  buildTime: 30,
  size: { width: 1, height: 1 },
  functionality: [
    {
      type: 'logistics_chest',
      chestType: 'storage',
    },
    {
      type: 'storage',
      capacity: 100,  // Double capacity
    },
  ],
  requiredResearch: 'robotics_ii',
  help: {
    summary: 'Logistics chest for overflow storage.',
    description: 'Stores items that don\'t have a specific destination. Robots deposit here when provider chests are full. Acts as passive storage that can still be accessed by requesters.',
  },
});
```

---

## Part 9: Component Type Registry

```typescript
/**
 * New component types for automation
 */
export enum ComponentType {
  // ... existing types ...

  // Power
  Power = 'power',
  PowerNetwork = 'power_network',

  // Logistics
  Belt = 'belt',
  MachineConnection = 'machine_connection',

  // Production
  AssemblyMachine = 'assembly_machine',

  // Robotics
  Roboport = 'roboport',
  Robot = 'robot',
  LogisticsChest = 'logistics_chest',
}
```

---

## Part 10: Agent Interaction

### Agent Configuration of Machines

```typescript
/**
 * Agents configure automation via UI and decision system
 */

// Example: Agent sets recipe on assembly machine
function configureAssemblyMachine(
  agent: Agent,
  machine: Entity,
  recipeId: string
): void {
  const assembly = (machine as EntityImpl).getComponent<AssemblyMachineComponent>(
    CT.AssemblyMachine
  );

  if (!assembly) {
    throw new Error('Entity is not an assembly machine');
  }

  // Verify recipe exists and is unlocked
  const recipe = world.recipeRegistry.tryGet(recipeId);
  if (!recipe) {
    throw new Error(`Recipe '${recipeId}' not found`);
  }

  // Check if agent has researched this recipe
  const researchState = world.getResearchState();
  if (!researchState.canCraftRecipe(recipeId)) {
    throw new Error(`Recipe '${recipeId}' not unlocked`);
  }

  // Set recipe
  assembly.currentRecipe = recipeId;
  assembly.progress = 0;

  // Log event
  world.eventBus.emit({
    type: 'machine:configured',
    source: agent.id,
    data: {
      machineId: machine.id,
      recipeId,
    },
  });

  // Record in memory
  agent.episodicMemory.record({
    type: 'machine_configured',
    summary: `I configured ${machine.getComponent(CT.Building)?.buildingType} to craft ${recipe.name}`,
    tick: world.tick,
    tags: ['automation', 'engineering'],
  });
}
```

### LLM Decision Making

```typescript
/**
 * Surfacing automation status in LLM context
 */
function buildAutomationContext(agent: Agent, world: World): string {
  let context = '=== Automation Status ===\n\n';

  // Power network status
  const powerNetworks = world.powerGridSystem.getNetworks();
  context += '**Power Grid:**\n';

  for (const network of powerNetworks) {
    const status = network.availability >= 0.9 ? '✅' :
                   network.availability >= 0.5 ? '⚠️' : '❌';

    context += `${status} ${network.powerType} network: ${network.totalGeneration}kW / ${network.totalConsumption}kW (${(network.availability * 100).toFixed(0)}%)\n`;
  }

  if (powerNetworks.length === 0) {
    context += '⚠️ No power network. Build windmills or generators.\n';
  }

  context += '\n';

  // Production status
  const machines = world.query()
    .with(CT.AssemblyMachine)
    .with(CT.Building)
    .executeEntities();

  context += '**Production Machines:**\n';

  if (machines.length === 0) {
    context += 'None built yet. Research and build assembly machines to automate crafting.\n';
  } else {
    for (const machine of machines) {
      const assembly = (machine as EntityImpl).getComponent<AssemblyMachineComponent>(
        CT.AssemblyMachine
      );
      const building = (machine as EntityImpl).getComponent<BuildingComponent>(CT.Building);
      const power = (machine as EntityImpl).getComponent<PowerComponent>(CT.Power);

      const isPowered = power?.isPowered ?? true;
      const status = isPowered ? '▶️' : '⏸️';

      if (assembly?.currentRecipe) {
        const recipe = world.recipeRegistry.tryGet(assembly.currentRecipe);
        context += `${status} ${building?.buildingType}: crafting ${recipe?.name} (${assembly.progress.toFixed(0)}%)\n`;
      } else {
        context += `⚠️ ${building?.buildingType}: idle (no recipe set)\n`;
      }
    }
  }

  context += '\n';

  // Robot logistics status
  const roboports = world.query()
    .with(CT.Roboport)
    .executeEntities();

  context += '**Robot Logistics:**\n';

  if (roboports.length === 0) {
    const hasResearch = world.getResearchState().completed.has('robotics_i');
    if (hasResearch) {
      context += '⚠️ Robotics researched but no roboports built. Build roboports to unlock robot logistics.\n';
    } else {
      context += 'Not yet researched. Research "Construction Automation" to unlock robot logistics.\n';
    }
  } else {
    for (const port of roboports) {
      const roboport = (port as EntityImpl).getComponent<RoboportComponent>(CT.Roboport);

      const idleRobots = roboport!.robots.filter(r => r.status === 'idle').length;
      const workingRobots = roboport!.robots.filter(r => r.status === 'working').length;
      const taskQueue = roboport!.taskQueue.length;

      context += `🤖 Roboport: ${idleRobots} idle, ${workingRobots} working, ${taskQueue} queued tasks\n`;
    }
  }

  return context;
}
```

### Agent Behaviors

```typescript
/**
 * High-level agent behaviors for automation
 */

// Behavior: Check and configure idle machines
function checkIdleMachines(agent: Agent, world: World): Decision {
  const machines = world.query()
    .with(CT.AssemblyMachine)
    .with(CT.Position)
    .executeEntities();

  const idleMachines = machines.filter(m => {
    const assembly = (m as EntityImpl).getComponent<AssemblyMachineComponent>(CT.AssemblyMachine);
    return !assembly?.currentRecipe;
  });

  if (idleMachines.length > 0) {
    const nearestIdle = findNearest(agent, idleMachines, world);

    return {
      type: 'configure_machine',
      target: nearestIdle.id,
      priority: 0.6,
      reasoning: 'Idle assembly machine needs recipe configuration',
    };
  }

  return { type: 'none' };
}

// Behavior: Monitor power shortages
function checkPowerShortage(agent: Agent, world: World): Decision {
  const networks = world.powerGridSystem.getNetworks();

  const lowPowerNetwork = networks.find(n => n.availability < 0.5);

  if (lowPowerNetwork) {
    return {
      type: 'build_generator',
      priority: 0.9,  // High priority!
      reasoning: `Power network at ${(lowPowerNetwork.availability * 100).toFixed(0)}% capacity. Need more generation.`,
    };
  }

  return { type: 'none' };
}

// Behavior: Set up robot logistics network
function setupRobotLogistics(agent: Agent, world: World): Decision {
  const hasRoboport = world.query().with(CT.Roboport).executeEntities().length > 0;

  if (!hasRoboport) {
    const hasResearch = world.getResearchState().completed.has('robotics_i');

    if (hasResearch) {
      return {
        type: 'build_roboport',
        priority: 0.7,
        reasoning: 'No roboport yet. Robot logistics will greatly improve efficiency.',
      };
    }
  }

  return { type: 'none' };
}
```

---

## Dependencies & Integration

### Depends On (Prerequisites)
These systems must be implemented before this spec:
- **Voxel Building System** - For automated construction with tile-based placement and material transport
- **Crafting System** - Foundation for automated crafting and production chains
- **Power Grid** - Required for powering machinery and conveyor systems
- **Item System** - Item definitions and registry for manufactured goods

### Integrates With (Parallel Systems)
These systems work alongside this spec:
- **Magic System** - Arcane power sources for machines, magical enhancements for production
- **Research System** - Tech tree unlocks for automation tiers and capabilities

### Enables (Dependent Systems)
These systems build on top of this spec:
- **Fully Automated Production Chains** - Complex multi-stage manufacturing without manual intervention
- **Robot Workforce** - Autonomous agents that handle logistics and production tasks
- **Post-Scarcity Economy** - Clarke Tech level automation enabling abundance

---

## Part 10: Voxel Building Integration - Emergent Factory Composition

> *"Buildings are not objects—they are spaces. Factories are not single entities—they are collections of machines within spaces."*

This section defines how the automation system integrates with the voxel building system to enable emergent factory composition. Instead of monolithic "factory buildings," players build rooms and place machines inside them, creating organic, modular production facilities.

### Design Philosophy

**Factories emerge from composition, not templates:**
- A **forge** is not a building—it's a machine placed inside a stone workshop
- A **factory** is not a blueprint—it's a collection of machines connected by belts in a room
- **Modular expansion** - Add more machines to existing buildings rather than build new factories
- **Organic growth** - Factories start small and grow as production needs increase

### Machine Placement in Voxel Buildings

Machines can be placed on floor tiles inside enclosed rooms. They occupy a single tile but can have multi-tile footprints for larger machines.

```typescript
/**
 * Machine Placement Component
 * Machines exist on floor tiles, can be inside buildings
 */
interface MachinePlacementComponent extends Component {
  readonly type: 'machine_placement';

  /** Is this machine indoors (inside a room)? */
  isIndoors: boolean;

  /** Room ID if indoors (from RoomDetectionSystem) */
  roomId?: string;

  /** Does this machine require shelter? */
  requiresShelter: boolean;

  /** Does this machine require power connection? */
  requiresPower: boolean;

  /** Footprint size (1x1, 2x2, 3x3, etc.) */
  footprint: { width: number; height: number };

  /** Adjacent tiles this machine blocks */
  blockedTiles: { x: number; y: number }[];
}

/**
 * MachineItem - Machines as placeable items
 * Like voxel building materials, machines are items that can be placed
 */
interface MachineItem extends ItemDefinition {
  /** Machine type identifier */
  machineType: string;

  /** Building requirement */
  placementRequirement: 'anywhere' | 'indoors' | 'outdoors' | 'on_power';

  /** Power consumption */
  powerConsumption: number;

  /** Footprint */
  footprint: { width: number; height: number };
}

// Example: Assembly Machine I as a placeable item
export const ASSEMBLY_MACHINE_I_ITEM = defineItem(
  'assembly_machine_i',
  'Assembly Machine I',
  'machine',
  {
    weight: 100,
    stackSize: 1,
    baseMaterial: 'iron',
    craftedFrom: [
      { itemId: 'iron_ingot', amount: 20 },
      { itemId: 'copper_wire', amount: 15 },
      { itemId: 'gear_assembly', amount: 10 },
    ],
    baseValue: 500,
    rarity: 'rare',
    machineType: 'assembly_machine',
    placementRequirement: 'indoors', // Must be inside a building
    powerConsumption: 100, // 100 kW
    footprint: { width: 2, height: 2 }, // 2x2 tiles
    help: {
      summary: 'Automated crafting machine. Place inside a building.',
      description: 'Assembly Machine I automatically crafts recipes when powered and supplied with ingredients. Requires shelter from weather. Place inside a workshop or factory building.',
    },
  }
);
```

### Room-Based Factories

Rooms detected by the voxel building system become factory spaces. Machines placed in rooms benefit from:
- **Weather protection** - Machines indoors don't suffer weather penalties
- **Power efficiency** - Insulation reduces power loss
- **Organization** - Rooms provide natural factory segmentation

```typescript
/**
 * Factory Room Extension
 * Extends Room interface from voxel building system
 */
interface FactoryRoom extends Room {
  /** Machines in this room */
  machines: Entity[];

  /** Power lines running through this room */
  powerLines: PowerLineSegment[];

  /** Belt segments in this room */
  belts: Entity[];

  /** Production efficiency (affected by room harmony) */
  productionEfficiency: number;

  /** Room purpose classification */
  purpose?: 'smelting' | 'assembly' | 'storage' | 'power_gen' | 'mixed';
}

/**
 * FactoryRoomAnalyzer - Classifies rooms based on machines
 */
class FactoryRoomAnalyzer {
  /**
   * Analyze a room and determine its factory purpose
   */
  analyzeRoom(room: Room, world: World): FactoryRoom {
    const machines = this.getMachinesInRoom(room, world);
    const belts = this.getBeltsInRoom(room, world);
    const powerLines = this.getPowerLinesInRoom(room, world);

    // Classify based on machine types
    const machineTypes = machines.map(m =>
      m.getComponent<AssemblyMachineComponent>('assembly_machine')?.machineType
    );

    let purpose: FactoryRoom['purpose'];
    if (machineTypes.every(t => t === 'furnace')) {
      purpose = 'smelting';
    } else if (machineTypes.every(t => t === 'assembly_machine')) {
      purpose = 'assembly';
    } else if (machines.length === 0 && belts.length > 0) {
      purpose = 'storage';
    } else {
      purpose = 'mixed';
    }

    // Calculate production efficiency from room harmony
    const harmony = this.getRoomHarmony(room, world);
    const productionEfficiency = 0.8 + (harmony.chiFlow * 0.2); // 80-100% based on feng shui

    return {
      ...room,
      machines,
      belts,
      powerLines,
      productionEfficiency,
      purpose,
    };
  }

  private getRoomHarmony(room: Room, world: World): any {
    // Integration with BuildingSpatialAnalysisSystem
    // Rooms with good feng shui have higher production efficiency
    const buildings = world.query().with('building_harmony').executeEntities();
    for (const building of buildings) {
      const harmony = building.getComponent('building_harmony');
      if (harmony?.rooms?.some(r => r.id === room.id)) {
        return harmony;
      }
    }
    return { chiFlow: 0.5 }; // Default moderate efficiency
  }
}
```

### Power Routing Through Buildings

Power lines can route through walls and floors using conduits:

```typescript
/**
 * Power Conduit - Routes power through walls/floors
 */
interface PowerConduitTile {
  /** Tile type */
  conduit: {
    /** Power type this conduit carries */
    powerType: PowerType;

    /** Current power flow (kW) */
    currentFlow: number;

    /** Maximum capacity (kW) */
    capacity: number;

    /** Connection points (which sides connect) */
    connections: Set<Direction>;
  };
}

/**
 * Extend Tile interface to include conduits
 */
interface TileWithConduit extends Tile {
  conduit?: PowerConduitTile['conduit'];
}

/**
 * Power routing through walls
 * Agents can place conduits to route power through walls without ugly exposed wires
 */
function placePowerConduit(
  pos: { x: number; y: number },
  direction: Direction,
  world: World
): void {
  const chunk = world.getChunkAt(pos.x, pos.y);
  const tile = chunk.getTile(pos.x % chunk.width, pos.y % chunk.height);

  if (!tile.wall && !tile.floor) {
    throw new Error('Conduits must be placed on walls or floors');
  }

  tile.conduit = {
    powerType: 'electrical',
    currentFlow: 0,
    capacity: 1000, // 1000 kW capacity
    connections: new Set([direction]),
  };
}
```

### Multi-Tile Factory Blueprints

Factory blueprints combine voxel building construction with machine placement:

```typescript
/**
 * Factory Blueprint - Combines voxel building + machines
 * Extends TileBasedBlueprint from voxel system
 */
interface FactoryBlueprint extends TileBasedBlueprint {
  /** Machines to place inside the building */
  machines: FactoryMachinePlacement[];

  /** Power conduits to route through walls */
  powerConduits: PowerConduitPlacement[];

  /** Belt layout inside the factory */
  beltLayout?: BeltPlacement[];

  /** Production purpose */
  productionType: 'smelting' | 'assembly' | 'mixed' | 'storage';
}

interface FactoryMachinePlacement {
  /** Machine item ID */
  machineItemId: string;

  /** Position relative to building origin */
  offset: { x: number; y: number };

  /** Initial recipe configuration (optional) */
  initialRecipe?: string;

  /** Rotation */
  rotation: 0 | 90 | 180 | 270;
}

interface PowerConduitPlacement {
  /** Tile position relative to building */
  offset: { x: number; y: number };

  /** Power type */
  powerType: PowerType;
}

interface BeltPlacement {
  /** Belt position */
  offset: { x: number; y: number };

  /** Belt direction */
  direction: Direction;

  /** Belt tier */
  tier: 1 | 2 | 3;
}

// Example: Smelting Factory Blueprint
export const SMELTING_FACTORY: FactoryBlueprint = {
  id: 'smelting_factory',
  name: 'Smelting Factory',

  // Building shell (from voxel system)
  layoutString: [
    "###########",
    "#.........#",
    "#.........#",
    "#.........#",
    "#.........D",  // Door on right
    "#.........#",
    "#.........#",
    "#.........#",
    "###########",
  ],

  resourceCost: [
    { resourceId: 'stone', amountRequired: 100 },
    { resourceId: 'wood', amountRequired: 50 },
    { resourceId: 'iron_ingot', amountRequired: 30 },
  ],

  wallMaterial: 'stone',
  floorMaterial: 'stone',
  doorMaterial: 'wood',
  category: 'crafting',
  provides: ['shelter', 'smelting'],

  // Factory-specific additions
  productionType: 'smelting',

  // Machine placements (4 furnaces in a row)
  machines: [
    {
      machineItemId: 'electric_furnace',
      offset: { x: 2, y: 2 },
      rotation: 0,
    },
    {
      machineItemId: 'electric_furnace',
      offset: { x: 5, y: 2 },
      rotation: 0,
    },
    {
      machineItemId: 'electric_furnace',
      offset: { x: 2, y: 5 },
      rotation: 0,
    },
    {
      machineItemId: 'electric_furnace',
      offset: { x: 5, y: 5 },
      rotation: 0,
    },
  ],

  // Power conduits through north wall
  powerConduits: [
    { offset: { x: 5, y: 0 }, powerType: 'electrical' },
  ],

  // Belt layout (input belt, output belts)
  beltLayout: [
    // Input belt from west
    { offset: { x: 1, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 2, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 3, y: 3 }, direction: 'east', tier: 1 },

    // Output belt to east
    { offset: { x: 7, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 8, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 9, y: 3 }, direction: 'east', tier: 1 },
  ],
};
```

### Emergent Factory Composition

Factories grow organically as agents add machines to existing buildings:

```typescript
/**
 * FactoryExpansionBehavior - Agents can expand factories
 * Instead of "build a new factory", agents "add a machine to the workshop"
 */
class FactoryExpansionBehavior implements BehaviorHandler {
  async execute(agent: Entity, params: any, world: World): Promise<BehaviorResult> {
    const { machineType, targetRoomId } = params;

    // Find the room
    const room = world.roomDetectionSystem.getRoom(targetRoomId);
    if (!room) {
      return { completed: true, result: 'failure', reason: 'Room not found' };
    }

    // Find empty floor tile in room
    const emptyTile = this.findEmptyFloorTile(room, world);
    if (!emptyTile) {
      return { completed: true, result: 'failure', reason: 'Room is full' };
    }

    // Check if agent has machine item
    const machineItem = `${machineType}_i`; // e.g., 'assembly_machine_i'
    if (!hasItem(agent.inventory, machineItem)) {
      return { completed: true, result: 'failure', reason: 'No machine item' };
    }

    // Place machine
    this.placeMachine(machineItem, emptyTile, world);
    removeFromInventory(agent.inventory, machineItem, 1);

    // Record memory
    agent.episodicMemory.record({
      type: 'factory_expansion',
      summary: `Added ${machineType} to ${room.category} room`,
      emotionalImpact: 0.6,
      tags: ['automation', 'building', 'expansion'],
    });

    return { completed: true, result: 'success' };
  }

  private findEmptyFloorTile(room: Room, world: World): { x: number; y: number } | null {
    for (const { x, y } of room.tiles) {
      const entities = world.getEntitiesAt(x, y);
      const hasObstacle = entities.some(e =>
        e.hasComponent('machine_placement') ||
        e.hasComponent('belt')
      );

      if (!hasObstacle) {
        return { x, y };
      }
    }
    return null;
  }
}
```

### Modular Production Chains

Factories can be chained by connecting rooms with belts:

```text
[Input Storage]  →  [Smelting Room]  →  [Assembly Room]  →  [Output Storage]
     (Room 1)            (Room 2)            (Room 3)            (Room 4)
       ↓                    ↓                   ↓                   ↓
    Provider            4 Furnaces         6 Assemblers         Requester
     Chest                  ↓                   ↓                  Chest
                       Belts carry         Belts carry
                       ore → ingots       ingots → products
```

Each room is a modular unit that can be expanded independently. Agents can:
- **Add more furnaces** to Room 2 if smelting is the bottleneck
- **Build another assembly room** (Room 5) if assembly capacity is needed
- **Connect rooms** with underground belts or robot logistics

### Integration with Tile Construction System

Factory construction uses the existing `TileConstructionSystem`:

```typescript
/**
 * Factory Construction Workflow
 * 1. Build voxel building shell (walls, floor, door)
 * 2. Route power conduits through walls
 * 3. Place machines on floor tiles
 * 4. Connect machines with belts
 * 5. Configure machine recipes
 */
async function constructFactory(
  blueprint: FactoryBlueprint,
  origin: { x: number; y: number },
  world: World
): Promise<void> {
  // Step 1: Create voxel building construction task
  const buildingTask = world.tileConstructionSystem.createConstructionTask(
    blueprint.id, // Uses blueprint as building blueprint
    origin,
    world
  );

  // Wait for building completion...
  // (Agents deliver materials, build tiles)

  // Step 2: Place power conduits
  for (const conduit of blueprint.powerConduits) {
    const pos = {
      x: origin.x + conduit.offset.x,
      y: origin.y + conduit.offset.y,
    };
    placePowerConduit(pos, 'east', world);
  }

  // Step 3: Place machines
  for (const machine of blueprint.machines) {
    const pos = {
      x: origin.x + machine.offset.x,
      y: origin.y + machine.offset.y,
    };

    createMachineEntity(machine.machineItemId, pos, world);
  }

  // Step 4: Place belts
  for (const belt of blueprint.beltLayout ?? []) {
    const pos = {
      x: origin.x + belt.offset.x,
      y: origin.y + belt.offset.y,
    };

    createBeltEntity(belt.tier, belt.direction, pos, world);
  }

  // Step 5: Agent configures recipes (not automated)
}
```

### Benefits of Voxel Integration

1. **Emergent Complexity** - Factories emerge from simple rules (place machines in rooms)
2. **Modular Design** - Rooms are natural factory modules
3. **Organic Growth** - Expand factories by adding machines, not rebuilding
4. **Spatial Awareness** - Feng shui and room harmony affect production efficiency
5. **Visual Clarity** - Walls provide visual boundaries for factory organization
6. **Realistic Logistics** - Belts route through doorways, power through conduits

### Implementation Notes

- **Backwards Compatibility**: Monolithic factory buildings can coexist with voxel factories
- **Migration Path**: Old "forge" buildings → forge machine inside stone workshop
- **Performance**: Room-based queries optimize machine updates
- **UI/UX**: Building placement UI shows footprint, power/belt connections

### Building Designer / Evolver

**Purpose:** Automatically generate and optimize factory building layouts using spatial awareness and genetic algorithms.

**Key Feature:** Unlike blind procedural generation, the designer/evolver is **spatially aware** - it understands machine connections, power flow, belt routing, and agent pathfinding.

```typescript
/**
 * Building Designer - Generates factory layouts from production requirements
 */
interface FactoryDesigner {
  /**
   * Generate factory layout for a production goal
   *
   * @param productionGoal - What to produce (e.g., "100 iron plates per minute")
   * @param constraints - Space, power, agent accessibility requirements
   * @returns Optimized factory blueprint
   */
  generateFactory(
    productionGoal: ProductionGoal,
    constraints: FactoryConstraints
  ): FactoryBlueprint;

  /**
   * Evolve existing factory to improve efficiency
   *
   * @param currentBlueprint - Existing factory layout
   * @param metrics - Current performance (throughput, power usage, bottlenecks)
   * @param generations - How many evolution cycles to run
   * @returns Improved factory blueprint
   */
  evolveFactory(
    currentBlueprint: FactoryBlueprint,
    metrics: FactoryMetrics,
    generations: number
  ): FactoryBlueprint;
}

/**
 * Production goal specification
 */
interface ProductionGoal {
  /** Target item to produce */
  outputItemId: string;

  /** Target production rate (items per minute) */
  targetRate: number;

  /** Available input items (e.g., raw materials from mining) */
  availableInputs: string[];

  /** Maximum power budget (kW) */
  maxPower: number;
}

/**
 * Factory constraints for generation
 */
interface FactoryConstraints {
  /** Maximum building size (tiles) */
  maxSize: { width: number; height: number };

  /** Agent accessibility requirement */
  agentType: 'ground' | 'flying';

  /** Building type (affects available materials) */
  buildingMaterial: 'wood' | 'stone' | 'metal';

  /** Must include specific features */
  requiredFeatures?: ('storage' | 'power_backup' | 'logistics_hub')[];
}

/**
 * Factory performance metrics for evolution
 */
interface FactoryMetrics {
  /** Actual throughput (items per minute) */
  actualThroughput: number;

  /** Power consumption (kW) */
  powerUsage: number;

  /** Bottlenecks detected */
  bottlenecks: string[];

  /** Agent pathfinding efficiency (0-1) */
  agentAccessibility: number;

  /** Belt utilization (0-1) */
  beltUtilization: number;
}
```

**Spatial Awareness Features:**

1. **Agent Pathfinding Aware**
   - Ground agents: Ensures corridors and access paths exist
   - Flying agents: Can use vertical stacking and aerial connections
   - Layouts vary based on agent type: ground-based factories have wide corridors, flying factories are more compact

2. **Connection Topology**
   - Understands machine input/output slots
   - Routes belts to minimize crossing and backtracking
   - Places power conduits optimally to minimize cable length

3. **Room Efficiency**
   - Analyzes feng shui impact of machine placement
   - Groups machines by production stage for organization
   - Balances room harmony for production bonuses

4. **Evolution Strategies**
   - **Mutation**: Randomly adjust machine positions, belt routes
   - **Crossover**: Combine successful layouts from different blueprints
   - **Selection**: Keep layouts with best throughput/power ratio
   - **Spatial Fitness**: Penalize layouts with poor agent access or belt spaghetti

```typescript
/**
 * Example: Generate iron plate factory
 */
const designer = new FactoryDesigner();

const goal: ProductionGoal = {
  outputItemId: 'iron_plate',
  targetRate: 100, // 100 plates per minute
  availableInputs: ['iron_ore'],
  maxPower: 500, // 500 kW
};

const constraints: FactoryConstraints = {
  maxSize: { width: 20, height: 20 },
  agentType: 'ground', // Most agents can't fly
  buildingMaterial: 'stone',
  requiredFeatures: ['storage'],
};

// Generate initial factory layout
const blueprint = designer.generateFactory(goal, constraints);

// After running for a while, evolve the factory
const metrics: FactoryMetrics = {
  actualThroughput: 85, // Only 85 plates/min (target was 100)
  powerUsage: 450,
  bottlenecks: ['smelting'], // Smelters are bottleneck
  agentAccessibility: 0.9, // Good agent access
  beltUtilization: 0.7, // Belts 70% utilized
};

// Evolve factory to fix bottleneck
const improvedBlueprint = designer.evolveFactory(blueprint, metrics, 10);
// After 10 generations: adds more smelters, improves belt routing
```

**Flying vs Ground Agent Layouts:**

```typescript
// Ground agent factory: Wide corridors, single-level
const groundFactory = {
  corridorWidth: 2, // 2 tiles wide for agent movement
  verticalLevels: 1, // Single floor
  machineSpacing: 3, // Space between machines for pathfinding
  doorways: true, // Explicit doorways for access
};

// Flying agent factory: Compact, multi-level
const flyingFactory = {
  corridorWidth: 0, // No corridors needed
  verticalLevels: 3, // Stack machines vertically
  machineSpacing: 1, // Tight packing
  aerialConnections: true, // Belts can cross over obstacles
};
```

This ensures factory layouts adapt to the agents that will use them, with ground-based agents requiring accessible, navigable spaces while flying agents enable more compact, efficient designs.

---

## Part 11: Implementation Phases

### Phase 1: Power Grid Foundation

**Goals:**
- Power generation and distribution
- Mechanical power (windmills, water wheels)
- Power consumption tracking

**Components:**
- [ ] `PowerComponent` interface
- [ ] `PowerNetwork` data structure
- [ ] `PowerGridSystem` (network building, power balance)

**Buildings:**
- [ ] Windmill blueprint
- [ ] Water Wheel blueprint

**Testing:**
- Place windmill → nearby machines powered
- Place two windmills → shared network
- Overload network → machines slow down

### Phase 2: Basic Belt Logistics

**Goals:**
- Conveyor belts that move items
- Direct machine connections
- Simple routing (no splitters yet)

**Components:**
- [ ] `BeltComponent` interface
- [ ] `BeltSystem` (item movement, transfer)
- [ ] `MachineConnectionComponent`
- [ ] `DirectConnectionSystem`

**Buildings:**
- [ ] Conveyor Belt (tier 1)
- [ ] Wooden Chute

**Items:**
- [ ] Belt Segment

**Research:**
- [ ] `logistics_i` - Basic Transport

**Testing:**
- Place belt → items move along it
- Connect two machines → items transfer directly
- Belt to machine → items input to machine

### Phase 3: Automated Production

**Goals:**
- Assembly machines auto-craft recipes
- Recipe configuration by agents
- Power consumption affects speed

**Components:**
- [ ] `AssemblyMachineComponent`
- [ ] `AssemblyMachineSystem` (auto-crafting)

**Buildings:**
- [ ] Mechanical Crafter (tier 2)
- [ ] Assembly Machine I (tier 3)
- [ ] Coal Generator

**Items:**
- [ ] Gear Assembly
- [ ] Electric Motor

**Research:**
- [ ] `production_i` - Mechanical Automation
- [ ] `production_ii` - Electric Factories

**Testing:**
- Set recipe on machine → crafts automatically
- Input items via belt → consumed by machine
- Output items to belt → appear on output belt
- Power failure → machine stops

### Phase 4: Electrical Grid

**Goals:**
- Electric power generation (coal)
- Power poles for distribution
- Electric belts (faster)

**Components:**
- Update `PowerGridSystem` for electrical networks
- Power pole connection graph

**Buildings:**
- [ ] Power Pole
- [ ] Electric Belt (tier 2)
- [ ] Item Filter
- [ ] Belt Junction

**Items:**
- [ ] Copper Wire

**Research:**
- [ ] `logistics_ii` - Powered Transport

**Testing:**
- Coal generator → produces power
- Power poles → distribute to 10 tiles
- Multiple poles → form network
- Electric belt → 3x faster than wooden

### Phase 5: Robot Logistics

**Goals:**
- Roboports store and manage robots
- Construction robots build from blueprints
- Logistics robots move items (REPLACES BELTS)

**Components:**
- [ ] `RoboportComponent`
- [ ] `RobotComponent`
- [ ] `LogisticsChestComponent`
- [ ] `RoboticLogisticsSystem`

**Buildings:**
- [ ] Roboport
- [ ] Requester Chest
- [ ] Provider Chest
- [ ] Storage Chest
- [ ] Robot Assembly

**Items:**
- [ ] Robot Frame
- [ ] Construction Robot
- [ ] Logistics Robot
- [ ] Logistics Chip

**Research:**
- [ ] `robotics_i` - Construction Automation
- [ ] `robotics_ii` - Logistics Automation

**Testing:**
- Place roboport + construction robot → builds from blueprint
- Place requester chest → requests items
- Place provider chest → provides items
- Logistics robot → fetches from provider, delivers to requester

### Phase 6: Advanced Production

**Goals:**
- Faster assembly machines
- Module system (speed/efficiency)
- Complex production chains

**Components:**
- [ ] Module slot system in `AssemblyMachineComponent`

**Buildings:**
- [ ] Assembly Machine II (tier 4)
- [ ] Oil Refinery

**Items:**
- [ ] Speed Module I
- [ ] Efficiency Module I
- [ ] Advanced Circuit

**Research:**
- [ ] `production_iii` - Mass Production

**Testing:**
- Install speed module → machine crafts 20% faster
- Install efficiency module → uses 20% less power
- Multiple modules → effects stack

### Phase 7: Arcane Endgame

**Goals:**
- Teleportation logistics
- Matter transmutation
- Arcane power generation

**Components:**
- [ ] Arcane power integration with magic system
- [ ] Transmutation effects using existing spell system

**Buildings:**
- [ ] Teleport Pad (instant item transfer)
- [ ] Dimensional Chest (shared inventory)
- [ ] Matter Transmuter (convert items)
- [ ] Ley Generator (infinite power)
- [ ] Assembly Machine III (instant crafting)

**Research:**
- [ ] `logistics_iii` - Dimensional Logistics
- [ ] `production_iv` - Arcane Manufacturing
- [ ] `robotics_iii` - Swarm Intelligence

**Testing:**
- Link teleport pads → items teleport instantly
- Matter transmuter → converts stone to iron (expensive)
- Ley generator on ley line → infinite power

---

## Part 12: Success Metrics

### Individual Agent Level

1. **Configuration Rate**
   - Target: Agents configure idle machines within 5 minutes
   - Measure: Time from machine construction to recipe assignment

2. **Automation Adoption**
   - Target: 80% of crafting via machines after Tier 3
   - Measure: Manual crafts vs machine crafts ratio

3. **Power Management**
   - Target: Agents build generators before power shortage
   - Measure: Frequency of power outages

### Settlement Level

1. **Production Throughput**
   - Target: 10x manual production by Tier 4
   - Measure: Items crafted per hour (manual vs automated)

2. **Robot Adoption**
   - Target: Logistics robots handle 90% of item movement by Tier 4
   - Measure: Belt traffic vs robot deliveries

3. **Complexity Scaling**
   - Target: 20+ machines running simultaneously
   - Measure: Active assembly machine count

### System Level

1. **Performance**
   - Target: 60 FPS with 50+ active machines
   - Measure: Frame rate with automation load

2. **Belt vs Robot Transition**
   - Hypothesis: Belts dominate Tier 2-3, robots dominate Tier 4+
   - Measure: Belt segment count vs robot count over time

3. **Agent Engineering Behavior**
   - Hypothesis: Agents spend more time optimizing than manual labor
   - Measure: % time configuring vs crafting/gathering

---

## Part 13: Research Questions

### Automation Dynamics

1. **Adoption Curves**
   - How quickly do agents transition from manual to automated production?
   - Is there a "tipping point" where automation becomes dominant?
   - Do some agents resist automation?

2. **Optimization Strategies**
   - Do agents discover efficient factory layouts?
   - Do agents use direct connections or prefer belts?
   - Do agents over-build or under-build power generation?

3. **Robot vs Belt Preference**
   - Once robots are available, do agents abandon belts entirely?
   - Are there use cases where belts remain preferred?
   - How does the compression of belt phase affect gameplay?

### Social Dynamics

1. **Cooperation Patterns**
   - Do agents share automation infrastructure?
   - Do specialized "engineers" emerge?
   - How do automation disparities affect social hierarchy?

2. **Knowledge Transfer**
   - Do agents teach each other factory designs?
   - Do successful layouts spread through the settlement?
   - Can agents import/export blueprints?

### Technical Performance

1. **Scalability**
   - How many active machines before performance degrades?
   - Does robot pathfinding become a bottleneck?
   - Are power network recalculations expensive?

2. **Complexity Management**
   - Do large factories become incomprehensible to agents?
   - Is there a cognitive limit to factory size?
   - Do agents modularize production into sub-factories?

---

## Part 14: Connection to Other Systems

### Research System Integration

```typescript
// Automation unlocks tie into existing research
world.researchRegistry.register(LOGISTICS_I);
world.researchRegistry.register(PRODUCTION_I);
world.researchRegistry.register(ROBOTICS_I);

// Research completion unlocks buildings
eventBus.subscribe('research:completed', (event) => {
  const { researchId, unlocks } = event.data;

  for (const unlock of unlocks) {
    if (unlock.type === 'building') {
      world.buildingRegistry.unlock(unlock.buildingId);
    }
  }
});
```

### Crafting System Integration

```typescript
// Machines use existing Recipe definitions
const recipe = world.recipeRegistry.get('iron_ingot');

// Machines check same prerequisites as manual crafting
const canCraft = world.researchState.canCraftRecipe(recipe.id);

// Quality system still applies (future enhancement)
const outputQuality = calculateCraftingQuality(agent, recipe);
```

### Inventory System Integration

```typescript
// Machines have inventory components for buffers
const machineInventory = machine.getComponent<InventoryComponent>(CT.Inventory);

// Items transferred using existing functions
removeFromInventory(source.inventory, 'iron_ore', 10);
addToInventoryWithQuality(target.inventory, 'iron_ingot', 5, 'normal');
```

### Memory & Learning Integration

```typescript
// Agents remember automation successes
agent.episodicMemory.record({
  type: 'automation_milestone',
  summary: 'Set up automated iron ingot production - 10x faster than manual!',
  emotionalImpact: 0.8,  // Positive achievement
  tags: ['automation', 'milestone', 'engineering'],
});

// Beliefs form about automation
agent.beliefs.add({
  category: 'world_mechanics',
  subject: 'automation',
  statement: 'Automated production is far more efficient than manual crafting',
  confidence: 0.95,
  evidence: [memory],
});
```

---

## Part 15: Visual Design

### Rendering Approach

```typescript
/**
 * Automation rendering layers
 */
enum RenderLayer {
  Ground = 0,        // Belts, power lines
  Buildings = 1,     // Machines, poles, roboports
  Items = 2,         // Items on belts
  Robots = 3,        // Flying robots
  Effects = 4,       // Smoke, sparks, magic auras
  UI = 5,            // Configuration overlays
}

/**
 * Belt rendering - animated scrolling texture
 */
function renderBelt(belt: BeltComponent, pos: PositionComponent, ctx: CanvasRenderingContext2D): void {
  const sprite = getBeltSprite(belt.tier, belt.direction);

  // Animate texture based on tick
  const scrollOffset = (world.tick * belt.speed) % 1.0;

  ctx.save();
  ctx.translate(pos.x * TILE_SIZE, pos.y * TILE_SIZE);
  ctx.drawImage(sprite, 0, scrollOffset * TILE_SIZE, TILE_SIZE, TILE_SIZE);

  // Render items on belt
  for (const item of belt.items) {
    const itemSprite = getItemSprite(item.itemId);
    const itemY = item.progress * TILE_SIZE;
    ctx.drawImage(itemSprite, TILE_SIZE / 4, itemY, TILE_SIZE / 2, TILE_SIZE / 2);
  }

  ctx.restore();
}

/**
 * Power line rendering - connect poles visually
 */
function renderPowerLines(world: World, ctx: CanvasRenderingContext2D): void {
  const networks = world.powerGridSystem.getNetworks();

  for (const network of networks) {
    for (const [nodeId, neighbors] of network.connections) {
      const node = world.getEntity(nodeId);
      if (!node) continue;

      const nodePos = (node as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (!nodePos) continue;

      for (const neighborId of neighbors) {
        const neighbor = world.getEntity(neighborId);
        if (!neighbor) continue;

        const neighborPos = (neighbor as EntityImpl).getComponent<PositionComponent>(CT.Position);
        if (!neighborPos) continue;

        // Draw power line
        ctx.strokeStyle = network.availability > 0.9 ? '#4CAF50' :
                          network.availability > 0.5 ? '#FFC107' : '#F44336';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nodePos.x * TILE_SIZE, nodePos.y * TILE_SIZE);
        ctx.lineTo(neighborPos.x * TILE_SIZE, neighborPos.y * TILE_SIZE);
        ctx.stroke();
      }
    }
  }
}

/**
 * Robot rendering - flying sprite with item
 */
function renderRobot(robot: RobotInstance, pos: { x: number; y: number }, ctx: CanvasRenderingContext2D): void {
  const sprite = robot.type === 'construction' ? constructionRobotSprite : logisticsRobotSprite;

  ctx.save();
  ctx.translate(pos.x, pos.y);

  // Bobbing animation
  const bobOffset = Math.sin(world.tick * 0.1) * 2;
  ctx.translate(0, bobOffset);

  ctx.drawImage(sprite, -8, -8, 16, 16);

  // Battery indicator
  const batteryColor = robot.battery > 60 ? '#4CAF50' :
                       robot.battery > 20 ? '#FFC107' : '#F44336';
  ctx.fillStyle = batteryColor;
  ctx.fillRect(-6, -10, (robot.battery / 100) * 12, 2);

  // If carrying item, show it
  if (robot.currentTask?.itemId) {
    const itemSprite = getItemSprite(robot.currentTask.itemId);
    ctx.drawImage(itemSprite, -4, 6, 8, 8);
  }

  ctx.restore();
}
```

### Color Coding

- **Mechanical**: Brown/wood tones, visible gears
- **Electrical**: Gray/metallic, blue sparks, power lines
- **Arcane**: Purple/gold, glowing runes, particle effects

### Animation Priorities

1. **Belts**: Scrolling texture (critical for feedback)
2. **Robots**: Flight paths and bobbing (engaging to watch)
3. **Machines**: Rotating parts when active (indicates status)
4. **Power lines**: Pulsing energy flow (shows connectivity)

---

## Conclusion

This automation system balances Factorio's depth with AI Village's unique constraints:

1. **Compressed progression** - Robots at Tier 4, not endgame
2. **Simple early game** - Cheap belts with direct connections
3. **Robot-focused endgame** - Logistics robots replace belt spaghetti
4. **Hybrid power systems** - Mechanical → Electrical → Arcane
5. **Agent-as-engineer** - Agents configure, machines execute

The result is accessible automation that scales gracefully from "first belt" to "robot mega-factory" while fitting AI Village's multi-system design.

---

**Document Version:** 1.0
**Created:** 2025-12-30
**Related Specifications:**
- [Item System](./ITEM_MAGIC_PERSISTENCE_SPEC.md) - Material properties and composition
- Research System (`packages/core/src/research/`) - Tech tree integration
- Building System (`packages/core/src/buildings/`) - Construction mechanics
- Crafting System (`packages/core/src/crafting/`) - Recipe execution
