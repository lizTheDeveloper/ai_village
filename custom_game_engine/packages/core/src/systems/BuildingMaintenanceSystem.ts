/**
 * BuildingMaintenanceSystem - Handles building degradation and maintenance needs
 *
 * Part of Phase 41: Autonomous Building System
 *
 * PERFORMANCE: Uses StateMutatorSystem for batched condition decay (60× improvement)
 * Instead of updating every 200 ticks, this system:
 * 1. Runs once per game hour to update decay rates based on weather/durability
 * 2. StateMutatorSystem handles the actual batched decay
 * 3. Event emission handled when crossing thresholds
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
import type { StateMutatorSystem } from './StateMutatorSystem.js';

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

  // Update interval (check every game hour = 3600 ticks)
  UPDATE_INTERVAL: 3600, // 1 game hour at 20 TPS
};

/**
 * BuildingMaintenanceSystem - Degrade buildings and emit repair events
 */
export class BuildingMaintenanceSystem implements System {
  public readonly id: SystemId = 'building_maintenance';
  public readonly priority: number = 120; // Run after most building-related systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Building, CT.Position];

  /**
   * Systems that must run before this one.
   */
  public readonly dependsOn = ['state_mutator'] as const;

  private lastUpdateTick: number = 0;
  private currentWeather: string = 'clear';
  private isInitialized = false;

  // Reference to StateMutatorSystem (set via setStateMutatorSystem)
  private stateMutator: StateMutatorSystem | null = null;

  // Track cleanup functions for registered deltas
  private deltaCleanups = new Map<string, () => void>();

  // Track last condition for threshold detection
  private lastConditions = new Map<string, number>();

  /**
   * Set the StateMutatorSystem reference.
   * Called by registerAllSystems during initialization.
   */
  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }

  /**
   * Initialize the system
   */
  public initialize(world: World, _eventBus: EventBus): void {
    if (this.isInitialized) return;

    // Subscribe to weather changes
    world.eventBus.subscribe('weather:changed', (event) => {
      const data = event.data as { condition?: string; weather?: string };
      this.currentWeather = data.condition ?? data.weather ?? 'clear';
      // Weather changed - need to recalculate decay rates
      this.lastUpdateTick = 0; // Force update on next tick
    });

    this.isInitialized = true;
  }

  /**
   * Update building conditions
   */
  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Check if StateMutatorSystem has been set
    if (!this.stateMutator) {
      throw new Error('[BuildingMaintenanceSystem] StateMutatorSystem not set - call setStateMutatorSystem() during initialization');
    }

    const currentTick = world.tick ?? 0;

    // Performance: Only update decay rates once per game hour
    const shouldUpdateRates = currentTick - this.lastUpdateTick >= DEGRADATION_CONFIG.UPDATE_INTERVAL;

    // Get weather multiplier
    const weatherMultiplier = DEGRADATION_CONFIG.WEATHER_MULTIPLIERS[this.currentWeather] ?? 1.0;

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>(CT.Building);
      const position = impl.getComponent<PositionComponent>(CT.Position);

      if (!building || !position) continue;

      // Skip incomplete buildings
      if (!building.isComplete) {
        // Clean up any existing deltas for incomplete buildings
        if (this.deltaCleanups.has(entity.id)) {
          const cleanup = this.deltaCleanups.get(entity.id)!;
          cleanup();
          this.deltaCleanups.delete(entity.id);
        }
        continue;
      }

      // Update decay rates based on weather/durability (once per game hour)
      if (shouldUpdateRates) {
        // Get durability modifier for building type
        const durabilityModifier = this.getDurabilityModifier(building.buildingType);

        // Calculate decay rate per game minute
        const decayRatePerMinute = -DEGRADATION_CONFIG.BASE_DEGRADATION_RATE *
          weatherMultiplier *
          durabilityModifier;

        // Clean up old delta if it exists
        if (this.deltaCleanups.has(entity.id)) {
          const cleanup = this.deltaCleanups.get(entity.id)!;
          cleanup();
        }

        // Register new delta with StateMutatorSystem
        const cleanup = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Building,
          field: 'condition',
          deltaPerMinute: decayRatePerMinute,
          min: 0,
          max: 100,
          source: 'building_maintenance',
        });

        // Store cleanup function
        this.deltaCleanups.set(entity.id, cleanup);
      }

      // Always check for threshold crossings (every tick)
      const currentCondition = building.condition;
      const lastCondition = this.lastConditions.get(entity.id) ?? 100;

      this.checkConditionThresholds(
        world,
        entity.id,
        building.buildingType,
        lastCondition,
        currentCondition,
        position,
        currentTick
      );

      // Update last condition
      this.lastConditions.set(entity.id, currentCondition);
    }

    // Mark rates as updated
    if (shouldUpdateRates) {
      this.lastUpdateTick = currentTick;
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

    // Default to wood durability
    return DEGRADATION_CONFIG.BUILDING_DURABILITY['wood'] ?? 1.0;
  }

  /**
   * Check for condition threshold crossings and emit events
   */
  private checkConditionThresholds(
    world: World,
    buildingId: string,
    buildingType: string,
    oldCondition: number,
    newCondition: number,
    position: PositionComponent,
    currentTick: number
  ): void {
    // Only emit events when crossing thresholds (downward)
    if (oldCondition >= DEGRADATION_CONFIG.NEEDS_REPAIR_THRESHOLD &&
        newCondition < DEGRADATION_CONFIG.NEEDS_REPAIR_THRESHOLD) {
      world.eventBus.emit({
        type: 'building:needs_repair',
        source: buildingId,
        timestamp: currentTick,
        data: {
          buildingId,
          buildingType,
          condition: newCondition,
          position: { x: position.x, y: position.y },
          priority: 'low',
        },
      } as any); // Type assertion for custom event
    }

    if (oldCondition >= DEGRADATION_CONFIG.CRITICAL_THRESHOLD &&
        newCondition < DEGRADATION_CONFIG.CRITICAL_THRESHOLD) {
      world.eventBus.emit({
        type: 'building:critical_repair',
        source: buildingId,
        timestamp: currentTick,
        data: {
          buildingId,
          buildingType,
          condition: newCondition,
          position: { x: position.x, y: position.y },
          priority: 'high',
        },
      } as any); // Type assertion for custom event
    }

    if (oldCondition >= DEGRADATION_CONFIG.COLLAPSE_THRESHOLD &&
        newCondition < DEGRADATION_CONFIG.COLLAPSE_THRESHOLD) {
      world.eventBus.emit({
        type: 'building:collapse_imminent',
        source: buildingId,
        timestamp: currentTick,
        data: {
          buildingId,
          buildingType,
          condition: newCondition,
          position: { x: position.x, y: position.y },
          priority: 'critical',
        },
      } as any); // Type assertion for custom event
    }
  }

  /**
   * Get interpolated condition value for UI display
   * Provides smooth visual updates between batch updates
   */
  getInterpolatedCondition(
    world: World,
    entityId: string,
    currentCondition: number
  ): number {
    if (!this.stateMutator) {
      return currentCondition; // Fallback to current value if not initialized
    }

    return this.stateMutator.getInterpolatedValue(
      entityId,
      CT.Building,
      'condition',
      currentCondition,
      world.tick
    );
  }
}
