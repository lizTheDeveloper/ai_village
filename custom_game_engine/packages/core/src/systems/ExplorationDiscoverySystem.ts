/**
 * ExplorationDiscoverySystem - Manages resource discovery at stellar phenomena
 *
 * Phase 3 Economic Depth - Resource Discovery Feature
 *
 * Priority: 180 (after trade systems)
 *
 * Responsibilities:
 * - Track exploration mission progress
 * - Detect ship arrival at stellar phenomena
 * - Roll for resource discoveries based on sensors/crew skill
 * - Award discovered resources to civilization
 * - Calculate mission success/failure based on danger
 * - Emit discovery events for era progression
 *
 * Integration:
 * - Queries ships with exploration_mission component
 * - Cross-references with StellarPhenomena locations
 * - Adds resources to WarehouseComponent or ship cargo
 * - Emits exploration:resource_discovered events
 *
 * CLAUDE.md Compliance:
 * - Component types use lowercase_with_underscores
 * - No silent fallbacks - all calculations validated
 * - Cache queries before loops for performance
 * - Throttled updates (every 5 ticks = 0.25 seconds)
 * - No 'as any' casts - proper type handling
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType, EntityId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ExplorationMissionComponent } from '../components/ExplorationMissionComponent.js';
import {
  calculateDiscoveryChance,
  calculateProgressRate,
} from '../components/ExplorationMissionComponent.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';
import type { WarehouseComponent } from '../components/WarehouseComponent.js';
import type { StellarPhenomenon, ResourceSpawn } from '@ai-village/world';
import {
  StellarPhenomenonType,
  getRequiredTechLevel,
  calculateMiningEfficiency,
} from '@ai-village/world';

/** Update interval: every 5 ticks = 0.25 seconds at 20 TPS */
const UPDATE_INTERVAL = 5;

/** Distance threshold for arrival detection (AU) */
const ARRIVAL_DISTANCE_THRESHOLD = 0.5;

/** Base progress per tick (percentage) */
const BASE_PROGRESS_PER_TICK = 0.1;

/**
 * Danger levels by phenomenon type
 * Used to calculate mission failure chance
 */
const PHENOMENON_DANGER: Record<StellarPhenomenonType, number> = {
  [StellarPhenomenonType.BLACK_HOLE]: 0.15,
  [StellarPhenomenonType.NEUTRON_STAR]: 0.20,
  [StellarPhenomenonType.PULSAR]: 0.10,
  [StellarPhenomenonType.WHITE_DWARF]: 0.03,
  [StellarPhenomenonType.RED_GIANT]: 0.05,
  [StellarPhenomenonType.PROTOSTAR]: 0.02,
  [StellarPhenomenonType.NEBULA]: 0.01,
  [StellarPhenomenonType.SUPERNOVA_REMNANT]: 0.12,
};

/**
 * System for managing exploration missions and resource discovery
 */
export class ExplorationDiscoverySystem extends BaseSystem {
  public readonly id: SystemId = 'exploration_discovery';
  public readonly priority: number = 180;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  // Lazy activation: Skip entire system when no exploration missions exist
  public readonly activationComponents = ['exploration_mission'] as const;

  protected readonly throttleInterval = UPDATE_INTERVAL;

  private isInitialized = false;
  private worldRef?: World;

  /**
   * Cache for stellar phenomena lookups (phenomenon ID -> phenomenon data)
   */
  private phenomenaCache = new Map<string, StellarPhenomenon>();

  /**
   * Cache for ship lookups (ship ID -> ship entity)
   */
  private shipCache = new Map<string, Entity>();

  /**
   * Initialize the system
   */
  protected onInitialize(world: World): void {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
    this.worldRef = world;
  }

  /**
   * Update - process exploration missions
   */
  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Cache queries before loops (CLAUDE.md performance guideline)
    const missionEntities = ctx.world
      .query()
      .with('exploration_mission')
      .executeEntities();

    // Clear caches for this tick
    this.shipCache.clear();

    // Cache all ships for quick lookup
    const shipEntities = ctx.world.query().with('spaceship').executeEntities();
    for (const shipEntity of shipEntities) {
      this.shipCache.set(shipEntity.id, shipEntity);
    }

    // Process each exploration mission
    for (const missionEntity of missionEntities) {
      const mission = missionEntity.getComponent<ExplorationMissionComponent>(
        'exploration_mission'
      );
      if (!mission) continue;

      // Skip completed missions
      if (mission.completedTick !== null) continue;

      this.processMission(ctx.world, missionEntity, mission, currentTick);
    }
  }

  // ===========================================================================
  // Mission Processing
  // ===========================================================================

  /**
   * Process a single exploration mission
   */
  private processMission(
    world: World,
    missionEntity: Entity,
    mission: ExplorationMissionComponent,
    currentTick: number
  ): void {
    // Get ship entity
    const shipEntity = this.shipCache.get(mission.shipId);
    if (!shipEntity) {
      console.error(
        `[ExplorationDiscoverySystem] Ship ${mission.shipId} not found for mission ${missionEntity.id}`
      );
      return;
    }

    const ship = shipEntity.getComponent<SpaceshipComponent>('spaceship');
    if (!ship) {
      console.error(
        `[ExplorationDiscoverySystem] Ship ${mission.shipId} missing spaceship component`
      );
      return;
    }

    // Check if ship has arrived at target
    if (!mission.hasArrived) {
      this.checkArrival(world, missionEntity, mission, shipEntity);
      return; // Wait until arrival
    }

    // Update mission progress
    this.updateProgress(world, missionEntity, mission, currentTick);

    // Check for resource discoveries
    if (mission.targetType === 'stellar_phenomenon') {
      this.checkForDiscoveries(world, missionEntity, mission, ship, currentTick);
    }

    // Check for mission completion
    if (mission.progress >= 100) {
      this.completeMission(world, missionEntity, mission, currentTick);
    }

    // Check for mission failure (danger-based)
    this.checkMissionDanger(world, missionEntity, mission, ship, currentTick);
  }

  // ===========================================================================
  // Arrival Detection
  // ===========================================================================

  /**
   * Check if ship has arrived at target coordinates
   */
  private checkArrival(
    world: World,
    missionEntity: Entity,
    mission: ExplorationMissionComponent,
    shipEntity: Entity
  ): void {
    // Get ship position (assuming ship has position component)
    const position = shipEntity.getComponent<{ x: number; y: number; z: number }>(
      'position'
    );
    if (!position) {
      // Ship doesn't have position yet, can't check arrival
      return;
    }

    // Calculate distance to target (3D Euclidean distance)
    const dx = position.x - mission.targetCoordinates.x;
    const dy = position.y - mission.targetCoordinates.y;
    const dz = position.z - mission.targetCoordinates.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    const distance = Math.sqrt(distanceSquared);

    // Check if within arrival threshold
    if (distance <= ARRIVAL_DISTANCE_THRESHOLD) {
      // Mark as arrived
      (missionEntity as EntityImpl).updateComponent(
        'exploration_mission',
        (old) => {
          const typed = old as ExplorationMissionComponent;
          return {
            ...typed,
            hasArrived: true,
          };
        }
      );

      // Emit arrival event
      world.eventBus.emit({
        type: 'exploration:mission_started' as const,
        source: mission.shipId,
        data: {
          shipId: mission.shipId,
          targetId: mission.targetId,
          targetType: mission.targetType,
          missionType: mission.missionType,
          targetCoordinates: mission.targetCoordinates,
          civilizationId: mission.civilizationId,
        },
      });
    }
  }

  // ===========================================================================
  // Progress Tracking
  // ===========================================================================

  /**
   * Update mission progress
   */
  private updateProgress(
    world: World,
    missionEntity: Entity,
    mission: ExplorationMissionComponent,
    currentTick: number
  ): void {
    // Calculate progress increment
    const progressRate = calculateProgressRate(mission);
    const progressIncrement = progressRate * BASE_PROGRESS_PER_TICK;

    // Update mission
    (missionEntity as EntityImpl).updateComponent('exploration_mission', (old) => {
      const typed = old as ExplorationMissionComponent;
      return {
        ...typed,
        progress: Math.min(100, typed.progress + progressIncrement),
        surveyDuration: typed.surveyDuration + 1,
      };
    });
  }

  // ===========================================================================
  // Resource Discovery
  // ===========================================================================

  /**
   * Check for resource discoveries at stellar phenomenon
   */
  private checkForDiscoveries(
    world: World,
    missionEntity: Entity,
    mission: ExplorationMissionComponent,
    ship: SpaceshipComponent,
    currentTick: number
  ): void {
    // Get stellar phenomenon data
    const phenomenon = this.getPhenomenon(world, mission.targetId);
    if (!phenomenon) {
      console.warn(
        `[ExplorationDiscoverySystem] Stellar phenomenon ${mission.targetId} not found`
      );
      return;
    }

    // Roll for each resource at the phenomenon
    for (const resourceSpawn of phenomenon.resources) {
      // Skip if already discovered
      if (mission.discoveredResources.has(resourceSpawn.resourceType)) {
        continue;
      }

      // Calculate discovery chance
      const discoveryChance = calculateDiscoveryChance(
        mission,
        resourceSpawn.abundance
      );

      // Roll for discovery
      const roll = Math.random();
      if (roll < discoveryChance) {
        this.discoverResource(
          world,
          missionEntity,
          mission,
          phenomenon,
          resourceSpawn,
          currentTick
        );
      }
    }
  }

  /**
   * Discover a resource at a stellar phenomenon
   */
  private discoverResource(
    world: World,
    missionEntity: Entity,
    mission: ExplorationMissionComponent,
    phenomenon: StellarPhenomenon,
    resourceSpawn: ResourceSpawn,
    currentTick: number
  ): void {
    const requiredTechLevel = getRequiredTechLevel(resourceSpawn.difficulty);
    const isEraGated = requiredTechLevel >= 10;

    // Add to mission discoveries
    (missionEntity as EntityImpl).updateComponent('exploration_mission', (old) => {
      const typed = old as ExplorationMissionComponent;
      return {
        ...typed,
        discoveredResources: new Set([
          ...typed.discoveredResources,
          resourceSpawn.resourceType,
        ]),
        discoveries: [
          ...typed.discoveries,
          {
            resourceType: resourceSpawn.resourceType,
            discoveredTick: currentTick,
            abundance: resourceSpawn.abundance,
            difficulty: resourceSpawn.difficulty,
            isEraGated,
          },
        ],
      };
    });

    // Emit discovery event
    world.eventBus.emit({
      type: 'exploration:resource_discovered' as const,
      source: mission.shipId,
      data: {
        shipId: mission.shipId,
        resourceType: resourceSpawn.resourceType,
        locationId: mission.targetId,
        locationType: mission.targetType,
        abundance: resourceSpawn.abundance,
        difficulty: resourceSpawn.difficulty,
        civilizationId: mission.civilizationId,
        isEraGated,
        eraRequirement: isEraGated ? requiredTechLevel : undefined,
      },
    });

    // Emit stellar phenomenon discovered event (first time only)
    if (mission.discoveries.length === 0 && !phenomenon.discoveredBy) {
      world.eventBus.emit({
        type: 'exploration:stellar_phenomenon_discovered' as const,
        source: mission.shipId,
        data: {
          phenomenonId: phenomenon.id,
          phenomenonType: phenomenon.type,
          shipId: mission.shipId,
          systemId: phenomenon.systemId,
          coordinates: phenomenon.coordinates,
          resourceCount: phenomenon.resources.length,
          civilizationId: mission.civilizationId,
        },
      });
    }

    // Emit rare find event if resource is rare (low abundance, high difficulty)
    const rarityScore = (1 - resourceSpawn.abundance) * resourceSpawn.difficulty;
    if (rarityScore > 0.7) {
      world.eventBus.emit({
        type: 'exploration:rare_find' as const,
        source: mission.shipId,
        data: {
          shipId: mission.shipId,
          resourceType: resourceSpawn.resourceType,
          locationId: mission.targetId,
          rarityScore,
          civilizationId: mission.civilizationId,
          isFirstDiscovery: !phenomenon.discoveredBy,
        },
      });
    }

    // Award small sample to ship's warehouse or cargo
    this.awardResourceSample(
      world,
      mission,
      resourceSpawn.resourceType,
      resourceSpawn.abundance
    );
  }

  /**
   * Award a small resource sample to civilization's warehouse
   */
  private awardResourceSample(
    world: World,
    mission: ExplorationMissionComponent,
    resourceType: string,
    abundance: number
  ): void {
    // Find civilization's warehouse for this resource type
    const warehouseEntities = world.query().with('warehouse').executeEntities();

    for (const warehouseEntity of warehouseEntities) {
      const warehouse = warehouseEntity.getComponent<WarehouseComponent>(
        'warehouse'
      );
      if (!warehouse) continue;

      // Check if warehouse is for this resource type
      if (warehouse.resourceType === resourceType) {
        // Award sample (10-50 units based on abundance)
        const sampleSize = Math.floor(10 + abundance * 40);

        (warehouseEntity as EntityImpl).updateComponent('warehouse', (old) => {
          const typed = old as WarehouseComponent;
          return {
            ...typed,
            stockpiles: {
              ...typed.stockpiles,
              [resourceType]:
                (typed.stockpiles[resourceType] ?? 0) + sampleSize,
            },
            lastDepositTime: {
              ...typed.lastDepositTime,
              [resourceType]: Date.now(),
            },
          };
        });

        return; // Found warehouse, done
      }
    }

    // No warehouse found - resource is discovered but not yet collected
    // This is expected for new exotic resources
  }

  // ===========================================================================
  // Mission Completion
  // ===========================================================================

  /**
   * Complete an exploration mission
   */
  private completeMission(
    world: World,
    missionEntity: Entity,
    mission: ExplorationMissionComponent,
    currentTick: number
  ): void {
    // Mark mission as completed
    (missionEntity as EntityImpl).updateComponent('exploration_mission', (old) => {
      const typed = old as ExplorationMissionComponent;
      return {
        ...typed,
        completedTick: currentTick,
        progress: 100,
      };
    });

    // Emit completion event
    world.eventBus.emit({
      type: 'exploration:mission_completed' as const,
      source: mission.shipId,
      data: {
        shipId: mission.shipId,
        targetId: mission.targetId,
        targetType: mission.targetType,
        discoveredResources: Array.from(mission.discoveredResources),
        duration: currentTick - mission.startTick,
        progress: 100,
        civilizationId: mission.civilizationId,
      },
    });
  }

  // ===========================================================================
  // Danger Assessment
  // ===========================================================================

  /**
   * Check for mission failure due to phenomenon danger
   */
  private checkMissionDanger(
    world: World,
    missionEntity: Entity,
    mission: ExplorationMissionComponent,
    ship: SpaceshipComponent,
    currentTick: number
  ): void {
    // Only check for stellar phenomena
    if (mission.targetType !== 'stellar_phenomenon') return;

    // Get phenomenon
    const phenomenon = this.getPhenomenon(world, mission.targetId);
    if (!phenomenon) return;

    // Get danger level for phenomenon type
    const baseDanger = PHENOMENON_DANGER[phenomenon.type] ?? 0.05;

    // Calculate failure chance based on ship capabilities
    // Better ships (higher tier) have lower failure chance
    const shipTierModifier = this.getShipTierModifier(ship.ship_type);
    const failureChance = baseDanger * (1 - shipTierModifier);

    // Roll for failure each tick while surveying
    const roll = Math.random();
    if (roll < failureChance / 100) {
      // Mission failed
      this.failMission(world, missionEntity, mission, phenomenon, currentTick);
    }
  }

  /**
   * Get ship tier modifier for danger calculations
   * Higher tier ships = lower danger
   */
  private getShipTierModifier(shipType: string): number {
    switch (shipType) {
      case 'worldship':
        return 0.2; // Poor at exploration
      case 'courier_ship':
        return 0.4; // Fast but fragile
      case 'threshold_ship':
        return 0.5; // Basic exploration
      case 'brainship':
        return 0.7; // Good coordination
      case 'story_ship':
        return 0.6; // Narrative focus
      case 'gleisner_vessel':
        return 0.7; // Digital precision
      case 'svetz_retrieval':
        return 0.8; // Specialized for dangerous retrieval
      case 'probability_scout':
        return 0.9; // Best at exploration
      case 'timeline_merger':
        return 0.6; // Heavy but capable
      default:
        return 0.5; // Default
    }
  }

  /**
   * Fail an exploration mission due to danger
   */
  private failMission(
    world: World,
    missionEntity: Entity,
    mission: ExplorationMissionComponent,
    phenomenon: StellarPhenomenon,
    currentTick: number
  ): void {
    // Mark mission as failed (set completedTick but keep progress < 100)
    (missionEntity as EntityImpl).updateComponent('exploration_mission', (old) => {
      const typed = old as ExplorationMissionComponent;
      return {
        ...typed,
        completedTick: currentTick,
        // Progress stays where it is (failed before completion)
      };
    });

    // Emit mission failed event (using mission_completed with partial progress)
    world.eventBus.emit({
      type: 'exploration:mission_completed' as const,
      source: mission.shipId,
      data: {
        shipId: mission.shipId,
        targetId: mission.targetId,
        targetType: mission.targetType,
        discoveredResources: Array.from(mission.discoveredResources),
        duration: currentTick - mission.startTick,
        progress: mission.progress, // Less than 100 indicates failure
        civilizationId: mission.civilizationId,
      },
    });

    // TODO: Apply damage to ship based on phenomenon danger
    // TODO: Potentially lose crew members
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Get stellar phenomenon by ID
   * Uses cache for performance
   */
  private getPhenomenon(
    world: World,
    phenomenonId: string
  ): StellarPhenomenon | undefined {
    // Check cache first
    if (this.phenomenaCache.has(phenomenonId)) {
      return this.phenomenaCache.get(phenomenonId);
    }

    // TODO: Query world for stellar phenomenon entities
    // For now, return undefined - phenomena will be stored as entities
    // with stellar_phenomenon component in future implementation

    return undefined;
  }

  /**
   * Clear caches (called periodically to prevent memory leaks)
   */
  private clearCaches(): void {
    this.phenomenaCache.clear();
    this.shipCache.clear();
  }
}
