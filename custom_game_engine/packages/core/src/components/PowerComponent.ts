import type { Component } from '../ecs/Component.js';

/**
 * Power types in the automation system
 * Tier 2: Mechanical (wind/water)
 * Tier 3-4: Electrical (coal/solar)
 * Tier 5: Arcane (mana/ley lines)
 * Tier 6-7: Stellar (Dyson Swarm satellites, stellar relay)
 * Tier 8: Exotic (Reality Anchor, advanced endgame tech)
 */
export type PowerType = 'mechanical' | 'electrical' | 'arcane' | 'stellar' | 'exotic';

/**
 * Power role - what this entity does with power
 */
export type PowerRole = 'producer' | 'consumer' | 'storage';

/**
 * Consumer priority levels for power allocation during shortages
 * Critical: Reality Anchor, life support, critical infrastructure
 * High: Important production facilities, defense systems
 * Normal: Standard machines, factories
 * Low: Non-essential systems, decorative elements
 */
export type ConsumerPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * PowerComponent - Power generation, consumption, or storage
 *
 * Attached to entities that interact with power grids:
 * - Generators (windmills, coal generators, ley generators)
 * - Machines (assembly machines, furnaces, pumps)
 * - Power poles (distribution)
 * - Batteries (storage)
 *
 * Part of automation system (AUTOMATION_LOGISTICS_SPEC.md Part 2)
 */
export interface PowerComponent extends Component {
  readonly type: 'power';

  /** Power role - producer, consumer, or storage */
  role: PowerRole;

  /** Power type this component handles */
  powerType: PowerType;

  /** Current power generation (kW) - for producers */
  generation: number;

  /** Power consumption (kW) - for consumers */
  consumption: number;

  /** Stored power (kWh) - for storage */
  stored: number;

  /** Storage capacity (kWh) - for storage */
  capacity: number;

  /** Is this entity currently powered? */
  isPowered: boolean;

  /** Efficiency modifier (0-1, affects actual generation/consumption) */
  efficiency: number;

  /** Connection range for power poles (tiles, 0 = not a pole) */
  connectionRange: number;

  /** Priority level for consumers (used during power shortages) */
  priority: ConsumerPriority;
}

/**
 * Factory function to create PowerComponent
 */
export function createPowerComponent(
  role: PowerRole,
  powerType: PowerType,
  params: {
    generation?: number;
    consumption?: number;
    capacity?: number;
    connectionRange?: number;
    priority?: ConsumerPriority;
  } = {}
): PowerComponent {
  return {
    type: 'power',
    version: 1,
    role,
    powerType,
    generation: params.generation ?? 0,
    consumption: params.consumption ?? 0,
    stored: 0,
    capacity: params.capacity ?? 0,
    isPowered: role === 'producer', // Producers are always "powered"
    efficiency: 1.0,
    connectionRange: params.connectionRange ?? 0,
    priority: params.priority ?? 'normal', // Default to normal priority
  };
}

/**
 * Create a power producer (generator)
 */
export function createPowerProducer(
  powerType: PowerType,
  baseGeneration: number,
  connectionRange: number = 0
): PowerComponent {
  return createPowerComponent('producer', powerType, {
    generation: baseGeneration,
    connectionRange,
  });
}

/**
 * Create a power consumer (machine)
 */
export function createPowerConsumer(
  powerType: PowerType,
  consumption: number,
  priority: ConsumerPriority = 'normal'
): PowerComponent {
  return createPowerComponent('consumer', powerType, {
    consumption,
    priority,
  });
}

/**
 * Create a power storage (battery)
 */
export function createPowerStorage(
  powerType: PowerType,
  capacity: number
): PowerComponent {
  return createPowerComponent('storage', powerType, {
    capacity,
  });
}
