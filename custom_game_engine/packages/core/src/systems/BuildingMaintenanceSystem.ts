/**
 * BuildingMaintenanceSystem - Handles building degradation and maintenance needs
 *
 * Part of Phase 41: Autonomous Building System
 *
 * Responsibilities:
 * - Degrades building condition over time
 * - Weather affects degradation rate
 * - Emits events when buildings need repair
 * - Tracks maintenance priority
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { EventBus } from '../events/EventBus.js';

/**
 * Degradation configuration
 */
const DEGRADATION_CONFIG = {
  // Base degradation rate (condition points lost per minute)
  BASE_DEGRADATION_RATE: 0.05, // ~3 points per hour

  // Weather multipliers
  WEATHER_MULTIPLIERS: {
    clear: 1.0,
    cloudy: 1.0,
    rain: 1.5,
    storm: 2.5,
    snow: 1.3,
    blizzard: 3.0,
  } as Record<string, number>,

  // Building type modifiers (some buildings are more durable)
  BUILDING_DURABILITY: {
    'stone': 0.5, // Stone buildings degrade slower
    'wood': 1.0,
    'tent': 2.0, // Temporary structures degrade faster
    'lean-to': 2.5,
    'bedroll': 3.0,
  } as Record<string, number>,

  // Condition thresholds for events
  NEEDS_REPAIR_THRESHOLD: 80, // Emit event at this level
  CRITICAL_THRESHOLD: 30, // Urgent repair needed
  COLLAPSE_THRESHOLD: 5, // Building may collapse

  // Update interval (check every N ticks)
  UPDATE_INTERVAL: 200, // Every 10 seconds at 20 TPS
};

/**
 * BuildingMaintenanceSystem - Degrade buildings and emit repair events
 */
export class BuildingMaintenanceSystem implements System {
  public readonly id: SystemId = 'building_maintenance';
  public readonly priority: number = 120; // Run after most building-related systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Building, CT.Position];

  private lastUpdateTick: number = 0;
  private currentWeather: string = 'clear';
  private isInitialized = false;

  /**
   * Initialize the system
   */
  public initialize(world: World, _eventBus: EventBus): void {
    if (this.isInitialized) return;

    // Subscribe to weather changes
    world.eventBus.subscribe('weather:changed', (event) => {
      const data = event.data as { condition?: string; weather?: string };
      this.currentWeather = data.condition ?? data.weather ?? 'clear';
    });

    this.isInitialized = true;
  }

  /**
   * Update building conditions
   */
  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick ?? 0;

    // Only run periodically
    if (currentTick - this.lastUpdateTick < DEGRADATION_CONFIG.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // Calculate time since last update in minutes
    const elapsedMinutes = (DEGRADATION_CONFIG.UPDATE_INTERVAL / 20) / 60;

    // Get weather multiplier
    const weatherMultiplier = DEGRADATION_CONFIG.WEATHER_MULTIPLIERS[this.currentWeather] ?? 1.0;

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>(CT.Building);
      const position = impl.getComponent<PositionComponent>(CT.Position);

      if (!building || !position) continue;

      // Skip incomplete buildings
      if (!building.isComplete) continue;

      // Get durability modifier for building type
      const durabilityModifier = this.getDurabilityModifier(building.buildingType);

      // Calculate degradation
      const degradation = DEGRADATION_CONFIG.BASE_DEGRADATION_RATE *
        elapsedMinutes *
        weatherMultiplier *
        durabilityModifier;

      const newCondition = Math.max(0, building.condition - degradation);
      const oldCondition = building.condition;

      // Update building condition
      impl.updateComponent<BuildingComponent>(CT.Building, (comp) => ({
        ...comp,
        condition: newCondition,
      }));

      // Emit events on threshold crossings
      this.checkConditionThresholds(world, entity.id, building.buildingType, oldCondition, newCondition, position, currentTick);
    }
  }

  /**
   * Get durability modifier for a building type
   */
  private getDurabilityModifier(buildingType: string): number {
    // Check for specific building type
    if (DEGRADATION_CONFIG.BUILDING_DURABILITY[buildingType]) {
      return DEGRADATION_CONFIG.BUILDING_DURABILITY[buildingType]!;
    }

    // Check for material-based durability
    if (buildingType.includes('stone') || buildingType === 'well' || buildingType === 'forge') {
      return DEGRADATION_CONFIG.BUILDING_DURABILITY['stone'] ?? 0.5;
    }
    if (buildingType === 'tent' || buildingType === 'lean-to' || buildingType === 'bedroll') {
      return DEGRADATION_CONFIG.BUILDING_DURABILITY[buildingType] ?? 2.0;
    }

    // Default wood durability
    return 1.0;
  }

  /**
   * Check condition thresholds and emit events
   * Uses generic event bus emit to support custom building maintenance events
   */
  private checkConditionThresholds(
    world: World,
    buildingId: string,
    _buildingType: string,
    oldCondition: number,
    newCondition: number,
    _position: PositionComponent,
    _currentTick: number
  ): void {
    // Use untyped event emission for custom events not in EventMap
    const eventBus = world.eventBus as { emit: (event: unknown) => void };

    // Crossed needs repair threshold
    if (oldCondition > DEGRADATION_CONFIG.NEEDS_REPAIR_THRESHOLD &&
        newCondition <= DEGRADATION_CONFIG.NEEDS_REPAIR_THRESHOLD) {
      eventBus.emit({
        type: 'building:needs_repair',
        source: 'building_maintenance_system',
        data: { buildingId, condition: newCondition, priority: 'low' },
      });
    }

    // Crossed critical threshold
    if (oldCondition > DEGRADATION_CONFIG.CRITICAL_THRESHOLD &&
        newCondition <= DEGRADATION_CONFIG.CRITICAL_THRESHOLD) {
      eventBus.emit({
        type: 'building:critical_condition',
        source: 'building_maintenance_system',
        data: { buildingId, condition: newCondition, priority: 'high' },
      });
    }

    // Crossed collapse threshold
    if (oldCondition > DEGRADATION_CONFIG.COLLAPSE_THRESHOLD &&
        newCondition <= DEGRADATION_CONFIG.COLLAPSE_THRESHOLD) {
      eventBus.emit({
        type: 'building:collapse_imminent',
        source: 'building_maintenance_system',
        data: { buildingId, condition: newCondition, priority: 'critical' },
      });
    }
  }
}
