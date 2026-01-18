import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { PowerComponent, PowerType } from '../components/PowerComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

/**
 * Power network - group of connected power entities
 */
export interface PowerNetwork {
  /** Network ID */
  id: string;

  /** Power type for this network */
  powerType: PowerType;

  /** Entities in this network */
  entities: Set<string>;

  /** Total power generation (kW) */
  totalGeneration: number;

  /** Total power consumption (kW) */
  totalConsumption: number;

  /** Power availability (0-1, >1 means surplus) */
  availability: number;

  /** Connection graph (entity ID -> connected entity IDs) */
  connections: Map<string, Set<string>>;
}

/**
 * PowerGridSystem - Manages power generation, distribution, and consumption
 *
 * Responsibilities:
 * - Build power networks from connected power poles
 * - Calculate total generation and consumption per network
 * - Distribute power to machines based on availability
 * - Update isPowered status on consumers
 *
 * Part of automation system (AUTOMATION_LOGISTICS_SPEC.md Part 2)
 */
export class PowerGridSystem extends BaseSystem {
  public readonly id: SystemId = 'power_grid';
  public readonly priority: number = 50; // Before other automation systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Power, CT.Position];
  // Only run when power components exist (O(1) activation check)
  public readonly activationComponents = [CT.Power] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  private networks: Map<string, PowerNetwork> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;

    // Step 1: Rebuild power networks from connections
    this.buildNetworks(ctx.activeEntities);

    // Step 2: Calculate generation and consumption for each network
    for (const network of this.networks.values()) {
      this.calculateNetworkPower(network, world);
    }

    // Step 3: Update isPowered status on all consumers
    for (const network of this.networks.values()) {
      this.updatePoweredStatus(network, world);
    }
  }

  /**
   * Build power networks from entity connections
   */
  private buildNetworks(entities: ReadonlyArray<Entity>): void {
    this.networks.clear();

    // Group entities by power type
    const entitiesByType = new Map<PowerType, Entity[]>();
    for (const entity of entities) {
      const power = (entity as EntityImpl).getComponent<PowerComponent>(CT.Power);
      if (!power) continue;

      if (!entitiesByType.has(power.powerType)) {
        entitiesByType.set(power.powerType, []);
      }
      entitiesByType.get(power.powerType)!.push(entity);
    }

    // Build network for each power type
    for (const [powerType, typeEntities] of entitiesByType) {
      this.buildNetworkForType(powerType, typeEntities);
    }
  }

  /**
   * Build network for a specific power type
   */
  private buildNetworkForType(powerType: PowerType, entities: Entity[]): void {
    const visited = new Set<string>();
    let networkCount = 0;

    for (const entity of entities) {
      if (visited.has(entity.id)) continue;

      // Start new network
      const networkId = `${powerType}_network_${networkCount++}`;
      const network: PowerNetwork = {
        id: networkId,
        powerType,
        entities: new Set(),
        totalGeneration: 0,
        totalConsumption: 0,
        availability: 0,
        connections: new Map(),
      };

      // Flood fill to find all connected entities
      this.floodFillNetwork(entity, entities, network, visited);

      this.networks.set(networkId, network);
    }
  }

  /**
   * Flood fill to find all entities connected to this one
   */
  private floodFillNetwork(
    entity: Entity,
    allEntities: Entity[],
    network: PowerNetwork,
    visited: Set<string>
  ): void {
    if (visited.has(entity.id)) return;

    visited.add(entity.id);
    network.entities.add(entity.id);

    const power = (entity as EntityImpl).getComponent<PowerComponent>(CT.Power);
    const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);

    if (!power || !pos) return;

    // If this is a power pole, find connected entities within range
    if (power.connectionRange > 0) {
      const nearby = this.findNearbyEntities(pos, power.connectionRange, allEntities, entity.id);

      for (const nearbyEntity of nearby) {
        const nearbyPower = (nearbyEntity as EntityImpl).getComponent<PowerComponent>(CT.Power);
        if (!nearbyPower || nearbyPower.powerType !== power.powerType) continue;

        // Add connection
        if (!network.connections.has(entity.id)) {
          network.connections.set(entity.id, new Set());
        }
        network.connections.get(entity.id)!.add(nearbyEntity.id);

        // Recursively flood fill
        this.floodFillNetwork(nearbyEntity, allEntities, network, visited);
      }
    } else {
      // Not a pole - connect to adjacent entities (poles or other non-poles at same location)
      const adjacent = this.findAdjacentEntities(pos, allEntities, entity.id);
      for (const adjEntity of adjacent) {
        const adjPower = (adjEntity as EntityImpl).getComponent<PowerComponent>(CT.Power);
        if (!adjPower || adjPower.powerType !== power.powerType) continue;

        // Connect to power poles OR to other non-poles at the exact same position
        const adjPos = (adjEntity as EntityImpl).getComponent<PositionComponent>(CT.Position);
        const isAtSamePosition = adjPos && Math.abs(pos.x - adjPos.x) < 0.01 && Math.abs(pos.y - adjPos.y) < 0.01;
        const isPole = adjPower.connectionRange > 0;

        if (!isPole && !isAtSamePosition) continue; // Skip non-poles that aren't at same position

        // Add connection
        if (!network.connections.has(entity.id)) {
          network.connections.set(entity.id, new Set());
        }
        network.connections.get(entity.id)!.add(adjEntity.id);

        // Recursively flood fill
        this.floodFillNetwork(adjEntity, allEntities, network, visited);
      }
    }
  }

  /**
   * Find entities within range (excluding the source entity itself)
   */
  private findNearbyEntities(
    pos: PositionComponent,
    range: number,
    entities: Entity[],
    excludeEntityId?: string
  ): Entity[] {
    const nearby: Entity[] = [];
    const rangeSquared = range * range;

    for (const entity of entities) {
      // Exclude the source entity itself
      if (excludeEntityId && entity.id === excludeEntityId) continue;

      const entityPos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (!entityPos) continue;

      const dx = pos.x - entityPos.x;
      const dy = pos.y - entityPos.y;
      const distSquared = dx * dx + dy * dy;

      if (distSquared <= rangeSquared) {
        nearby.push(entity);
      }
    }

    return nearby;
  }

  /**
   * Find adjacent entities (within 1 tile)
   */
  private findAdjacentEntities(pos: PositionComponent, entities: Entity[], excludeEntityId?: string): Entity[] {
    return this.findNearbyEntities(pos, 1.5, entities, excludeEntityId);
  }

  /**
   * Calculate total generation and consumption for network
   */
  private calculateNetworkPower(network: PowerNetwork, world: World): void {
    let totalGeneration = 0;
    let totalConsumption = 0;

    for (const entityId of network.entities) {
      const entity = world.getEntity(entityId);
      if (!entity) continue;

      const power = (entity as EntityImpl).getComponent<PowerComponent>(CT.Power);
      if (!power) continue;

      if (power.role === 'producer') {
        totalGeneration += power.generation * power.efficiency;
      } else if (power.role === 'consumer') {
        totalConsumption += power.consumption;
      }
    }

    network.totalGeneration = totalGeneration;
    network.totalConsumption = totalConsumption;

    // Calculate availability (>1 = surplus, <1 = shortage)
    if (totalConsumption > 0) {
      network.availability = totalGeneration / totalConsumption;
    } else {
      network.availability = totalGeneration > 0 ? 2.0 : 0.0;
    }
  }

  /**
   * Update isPowered status on all consumers in network with priority-based allocation
   */
  private updatePoweredStatus(network: PowerNetwork, world: World): void {
    // If sufficient power for all, everyone gets powered
    if (network.availability >= 1.0) {
      for (const entityId of network.entities) {
        const entity = world.getEntity(entityId);
        if (!entity) continue;

        const power = (entity as EntityImpl).getComponent<PowerComponent>(CT.Power);
        if (!power || power.role !== 'consumer') continue;

        power.isPowered = true;
        power.efficiency = 1.0;
      }
      return;
    }

    // Power shortage - allocate by priority
    const consumers: Array<{ id: string; power: PowerComponent }> = [];
    for (const entityId of network.entities) {
      const entity = world.getEntity(entityId);
      if (!entity) continue;

      const power = (entity as EntityImpl).getComponent<PowerComponent>(CT.Power);
      if (!power || power.role !== 'consumer') continue;

      consumers.push({ id: entityId, power });
    }

    // Sort by priority (critical > high > normal > low)
    const priorityOrder = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    } as const;
    consumers.sort((a, b) => {
      const aPriority = priorityOrder[a.power.priority] ?? 2; // Default to normal
      const bPriority = priorityOrder[b.power.priority] ?? 2;
      return aPriority - bPriority;
    });

    // Allocate power starting from highest priority
    let remainingPower = network.totalGeneration;

    for (const consumer of consumers) {
      const { power } = consumer;

      if (remainingPower >= power.consumption) {
        // Full power available
        power.isPowered = true;
        power.efficiency = 1.0;
        remainingPower -= power.consumption;
      } else if (remainingPower > 0) {
        // Partial power available
        power.isPowered = false;
        power.efficiency = remainingPower / power.consumption;
        remainingPower = 0;
      } else {
        // No power available
        power.isPowered = false;
        power.efficiency = 0;
      }
    }
  }

  /**
   * Get all power networks (for debugging/visualization)
   */
  public getNetworks(): PowerNetwork[] {
    return Array.from(this.networks.values());
  }

  /**
   * Get network for entity
   */
  public getNetworkForEntity(entityId: string): PowerNetwork | null {
    for (const network of this.networks.values()) {
      if (network.entities.has(entityId)) {
        return network;
      }
    }
    return null;
  }
}
