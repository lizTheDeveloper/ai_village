/**
 * SpaceshipConstructionSystem - Manages construction of spaceships at shipyards
 *
 * This system handles:
 * - Tracking spaceship construction progress at shipyard buildings
 * - Creating spaceship entities when construction starts
 * - Completing spaceships and adding required components
 * - Emitting events for construction milestones
 *
 * Based on spaceships-and-vr-spec.md and SpaceshipResearch.ts tech tree.
 *
 * Per CLAUDE.md: No silent fallbacks - crashes on invalid state.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { TagsComponent } from '../components/TagsComponent.js';
import {
  type SpaceshipComponent,
  type SpaceshipType,
  createSpaceshipComponent,
} from '../navigation/SpaceshipComponent.js';
import {
  createHeartChamberComponent,
  createEmotionTheaterComponent,
  createMemoryHallComponent,
  createMeditationChamberComponent,
} from '../navigation/ShipComponentEntities.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import { createInventoryComponent } from '../components/InventoryComponent.js';
import { createTagsComponent } from '../components/TagsComponent.js';

/**
 * Spaceship construction project tracking
 */
export interface SpaceshipConstructionProject {
  /** Unique construction project ID */
  projectId: string;
  /** Type of spaceship being built */
  shipType: SpaceshipType;
  /** Custom name for the ship */
  shipName: string;
  /** Shipyard building entity ID */
  shipyardId: string;
  /** Agent who initiated construction */
  builderId: string;
  /** Construction progress (0-100) */
  progress: number;
  /** Game tick when construction started */
  startedAt: number;
  /** Total ticks required for construction */
  totalTicks: number;
  /** Created spaceship entity ID (once construction begins) */
  spaceshipEntityId?: string;
}

/**
 * Ship configuration for each spaceship type
 */
interface ShipTypeConfig {
  constructionTime: number; // ticks
  crewCapacity: number;
  requiredBuilding: 'shipyard_basic' | 'shipyard_advanced' | 'worldship_drydock';
  components: {
    heartChamber: boolean;
    emotionTheater: boolean;
    memoryHall: boolean;
    meditationChamber: boolean;
  };
}

/**
 * Configuration for all spaceship types
 */
const SHIP_CONFIGS: Record<SpaceshipType, ShipTypeConfig> = {
  worldship: {
    constructionTime: 12000, // 10 minutes at 20 TPS
    crewCapacity: 100,
    requiredBuilding: 'worldship_drydock',
    components: {
      heartChamber: false, // Physical propulsion only
      emotionTheater: false,
      memoryHall: false,
      meditationChamber: true, // For long journey crew welfare
    },
  },
  threshold_ship: {
    constructionTime: 8000,
    crewCapacity: 30,
    requiredBuilding: 'shipyard_advanced',
    components: {
      heartChamber: true,
      emotionTheater: true,
      memoryHall: false,
      meditationChamber: true,
    },
  },
  courier_ship: {
    constructionTime: 4000,
    crewCapacity: 2,
    requiredBuilding: 'shipyard_advanced',
    components: {
      heartChamber: true,
      emotionTheater: false,
      memoryHall: false,
      meditationChamber: true,
    },
  },
  brainship: {
    constructionTime: 10000,
    crewCapacity: 1,
    requiredBuilding: 'shipyard_advanced',
    components: {
      heartChamber: true, // The brain IS the heart
      emotionTheater: false,
      memoryHall: true, // Enhanced memory
      meditationChamber: false,
    },
  },
  story_ship: {
    constructionTime: 10000,
    crewCapacity: 50,
    requiredBuilding: 'shipyard_advanced',
    components: {
      heartChamber: true,
      emotionTheater: true,
      memoryHall: true, // Critical for cultural preservation
      meditationChamber: true,
    },
  },
  gleisner_vessel: {
    constructionTime: 14000,
    crewCapacity: 0, // No separate crew - consciousness IS the ship
    requiredBuilding: 'shipyard_advanced',
    components: {
      heartChamber: false, // Unified consciousness
      emotionTheater: false,
      memoryHall: true,
      meditationChamber: false,
    },
  },
  svetz_retrieval: {
    constructionTime: 16000,
    crewCapacity: 3,
    requiredBuilding: 'shipyard_advanced',
    components: {
      heartChamber: true,
      emotionTheater: true,
      memoryHall: true, // For temporal samples
      meditationChamber: true,
    },
  },
  probability_scout: {
    constructionTime: 12000,
    crewCapacity: 1,
    requiredBuilding: 'shipyard_advanced',
    components: {
      heartChamber: false, // Solo explorer
      emotionTheater: false,
      memoryHall: true, // Branch documentation
      meditationChamber: true,
    },
  },
  timeline_merger: {
    constructionTime: 24000, // Very long construction
    crewCapacity: 20,
    requiredBuilding: 'shipyard_advanced',
    components: {
      heartChamber: true,
      emotionTheater: true,
      memoryHall: true,
      meditationChamber: true,
    },
  },
};

/**
 * SpaceshipConstructionSystem manages spaceship construction at shipyards.
 */
export class SpaceshipConstructionSystem extends BaseSystem {
  public readonly id: SystemId = 'spaceship_construction';
  public readonly priority: number = 156; // After SpaceshipManagementSystem (155)
  public readonly requiredComponents = [CT.Building] as const;
  // Lazy activation: Skip entire system when no shipyards exist in world
  public readonly activationComponents = ['shipyard'] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  /** Active construction projects indexed by project ID */
  private activeProjects = new Map<string, SpaceshipConstructionProject>();

  /** Projects indexed by shipyard ID for quick lookup */
  private projectsByShipyard = new Map<string, string>();

  /**
   * Initialize event listeners.
   */
  protected onInitialize(): void {
    // Listen for construction requests
    this.events.on('spaceship:construction:start', (data) => {
      this.handleConstructionStart(this.world, data as {
        shipyardId: string;
        shipType: SpaceshipType;
        shipName: string;
        builderId: string;
      });
    });

    // Listen for construction cancellation
    this.events.on('spaceship:construction:cancel', (data) => {
      this.handleConstructionCancel(this.world, data as { projectId: string });
    });
  }

  /**
   * Update construction progress for all active projects.
   */
  protected onUpdate(ctx: SystemContext): void {
    // Process active construction projects
    for (const [projectId, project] of this.activeProjects) {
      // Check if shipyard still exists
      const shipyard = ctx.world.getEntity(project.shipyardId);
      if (!shipyard) {
        // Shipyard destroyed - cancel project
        this.cancelProject(ctx.world, projectId, 'shipyard_destroyed');
        continue;
      }

      // Check if shipyard is operational
      const building = shipyard.getComponent<BuildingComponent>(CT.Building);
      if (!building || building.progress < 100) {
        // Shipyard not complete - pause construction
        continue;
      }

      // Advance construction progress
      const progressPerTick = 100 / project.totalTicks;
      project.progress = Math.min(100, project.progress + progressPerTick);

      // Check for completion
      if (project.progress >= 100) {
        this.completeConstruction(ctx.world, project);
      } else {
        // Emit progress event every 25%
        const prevProgress = Math.floor((project.progress - progressPerTick) / 25) * 25;
        const currProgress = Math.floor(project.progress / 25) * 25;
        if (currProgress > prevProgress) {
          ctx.world.eventBus.emit({
            type: 'spaceship:construction:progress',
            source: project.shipyardId,
            data: {
              projectId,
              shipType: project.shipType,
              shipName: project.shipName,
              progress: project.progress,
              milestone: currProgress,
              ticksRemaining: project.ticksRemaining,
            },
          });
        }
      }
    }
  }

  /**
   * Handle a new construction start request.
   */
  private handleConstructionStart(
    world: World,
    data: {
      shipyardId: string;
      shipType: SpaceshipType;
      shipName: string;
      builderId: string;
    }
  ): void {
    const { shipyardId, shipType, shipName, builderId } = data;

    // Validate shipyard exists
    const shipyard = world.getEntity(shipyardId);
    if (!shipyard) {
      throw new Error(`Shipyard ${shipyardId} not found`);
    }

    // Check if shipyard is already building something
    if (this.projectsByShipyard.has(shipyardId)) {
      world.eventBus.emit({
        type: 'spaceship:construction:failed',
        source: shipyardId,
        data: {
          shipyardId,
          shipType,
          reason: 'shipyard_busy',
        },
      });
      return;
    }

    // Validate ship type configuration
    const config = SHIP_CONFIGS[shipType];
    if (!config) {
      throw new Error(`Unknown ship type: ${shipType}`);
    }

    // Validate shipyard can build this ship type
    const building = shipyard.getComponent<BuildingComponent>(CT.Building);
    if (!building) {
      throw new Error(`Shipyard ${shipyardId} has no building component`);
    }

    // Check if this shipyard type can build this ship
    const shipyardType = building.buildingType;
    if (!this.canShipyardBuild(shipyardType, shipType)) {
      world.eventBus.emit({
        type: 'spaceship:construction:failed',
        source: shipyardId,
        data: {
          shipyardId,
          shipType,
          reason: 'shipyard_incompatible',
          required: config.requiredBuilding,
          actual: shipyardType,
        },
      });
      return;
    }

    // Create construction project
    const projectId = `ship_project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const project: SpaceshipConstructionProject = {
      projectId,
      shipType,
      shipName,
      shipyardId,
      builderId,
      progress: 0,
      startedAt: world.tick,
      totalTicks: config.constructionTime,
    };

    // Create spaceship entity (initially in construction state)
    const spaceshipEntity = this.createSpaceshipEntity(world, project, shipyard as EntityImpl);
    project.spaceshipEntityId = spaceshipEntity.id;

    // Register project
    this.activeProjects.set(projectId, project);
    this.projectsByShipyard.set(shipyardId, projectId);

    // Emit start event
    world.eventBus.emit({
      type: 'spaceship:construction:started',
      source: shipyardId,
      data: {
        projectId,
        shipyardId,
        shipType,
        shipName,
        builderId,
        estimatedTicks: config.constructionTime,
        estimatedHours: config.constructionTime / (20 * 60), // ticks to hours
      },
    });
  }

  /**
   * Check if a shipyard type can build a specific ship type.
   */
  private canShipyardBuild(shipyardType: string, shipType: SpaceshipType): boolean {
    // Map of shipyard capabilities
    const shipyardCapabilities: Record<string, SpaceshipType[]> = {
      'shipyard_basic': ['worldship'],
      'worldship_drydock': ['worldship'],
      'shipyard_advanced': [
        'threshold_ship',
        'courier_ship',
        'brainship',
        'story_ship',
        'gleisner_vessel',
        'svetz_retrieval',
        'probability_scout',
        'timeline_merger',
      ],
    };

    const capabilities = shipyardCapabilities[shipyardType];
    if (!capabilities) {
      return false;
    }

    return capabilities.includes(shipType);
  }

  /**
   * Create the spaceship entity at the shipyard location.
   */
  private createSpaceshipEntity(
    world: World,
    project: SpaceshipConstructionProject,
    shipyard: EntityImpl
  ): EntityImpl {
    const shipyardPos = shipyard.getComponent<PositionComponent>(CT.Position);

    // Create spaceship entity
    const spaceship = world.createEntity() as EntityImpl;

    // Add position (at shipyard, will be moved when launched)
    spaceship.addComponent(
      createPositionComponent(
        shipyardPos?.x ?? 0,
        shipyardPos?.y ?? 0
      )
    );

    // Add spaceship component
    spaceship.addComponent(
      createSpaceshipComponent(
        project.shipType,
        project.shipName
      )
    );

    // Add renderable (construction sprite) - use 'building' layer
    spaceship.addComponent(
      createRenderableComponent('ship_construction', 'building')
    );

    // Add inventory for ship storage
    spaceship.addComponent(
      createInventoryComponent(50)
    );

    // Add tags using spread syntax
    spaceship.addComponent(
      createTagsComponent(
        'spaceship',
        'under_construction',
        project.shipType
      )
    );

    return spaceship;
  }

  /**
   * Complete spaceship construction and add all required components.
   */
  private completeConstruction(world: World, project: SpaceshipConstructionProject): void {
    if (!project.spaceshipEntityId) {
      throw new Error(`Project ${project.projectId} has no spaceship entity`);
    }

    const spaceship = world.getEntity(project.spaceshipEntityId);
    if (!spaceship) {
      throw new Error(`Spaceship entity ${project.spaceshipEntityId} not found`);
    }

    const config = SHIP_CONFIGS[project.shipType];
    const spaceshipImpl = spaceship as EntityImpl;

    // Update renderable to completed ship sprite
    spaceshipImpl.updateComponent(CT.Renderable, (comp) => ({
      ...comp,
      spriteId: `ship_${project.shipType}`,
    }));

    // Update tags - remove under_construction
    const tagsComp = spaceship.getComponent<TagsComponent>(CT.Tags);
    if (tagsComp) {
      const newTags = tagsComp.tags.filter((t: string) => t !== 'under_construction');
      newTags.push('operational');
      spaceshipImpl.updateComponent(CT.Tags, (comp) => ({
        ...comp,
        tags: newTags,
      }));
    }

    // Add ship component entities based on configuration
    if (config.components.heartChamber) {
      this.createShipComponentEntity(world, spaceship.id, 'heart_chamber', project.shipName);
    }
    if (config.components.emotionTheater) {
      this.createShipComponentEntity(world, spaceship.id, 'emotion_theater', project.shipName);
    }
    if (config.components.memoryHall) {
      this.createShipComponentEntity(world, spaceship.id, 'memory_hall', project.shipName);
    }
    if (config.components.meditationChamber) {
      this.createShipComponentEntity(world, spaceship.id, 'meditation_chamber', project.shipName);
    }

    // Clear project tracking
    this.activeProjects.delete(project.projectId);
    this.projectsByShipyard.delete(project.shipyardId);

    // Emit completion event
    world.eventBus.emit({
      type: 'spaceship:construction:complete',
      source: project.shipyardId,
      data: {
        projectId: project.projectId,
        spaceshipEntityId: project.spaceshipEntityId,
        shipType: project.shipType,
        shipName: project.shipName,
        builderId: project.builderId,
        buildTime: project.ticksElapsed / 20, // Convert ticks to seconds
        ticksElapsed: project.ticksElapsed,
      },
    });
  }

  /**
   * Create a ship component entity (Heart Chamber, Emotion Theater, etc.)
   */
  private createShipComponentEntity(
    world: World,
    shipId: string,
    componentType: 'heart_chamber' | 'emotion_theater' | 'memory_hall' | 'meditation_chamber',
    shipName: string
  ): EntityImpl {
    const entityImpl = world.createEntity() as EntityImpl;

    switch (componentType) {
      case 'heart_chamber':
        entityImpl.addComponent(createHeartChamberComponent(shipId, `${shipName} Heart`));
        break;
      case 'emotion_theater':
        entityImpl.addComponent(createEmotionTheaterComponent(shipId, `${shipName} Theater`));
        break;
      case 'memory_hall':
        entityImpl.addComponent(createMemoryHallComponent(shipId, `${shipName} Memory Hall`));
        break;
      case 'meditation_chamber':
        entityImpl.addComponent(createMeditationChamberComponent(shipId, `${shipName} Meditation`));
        break;
    }

    // Add tags for component using spread syntax
    entityImpl.addComponent(
      createTagsComponent(
        'ship_component',
        componentType,
        `ship:${shipId}`
      )
    );

    return entityImpl;
  }

  /**
   * Handle construction cancellation.
   */
  private handleConstructionCancel(world: World, data: { projectId: string }): void {
    const project = this.activeProjects.get(data.projectId);
    if (!project) {
      return; // Already cancelled or completed
    }

    this.cancelProject(world, data.projectId, 'cancelled_by_player');
  }

  /**
   * Cancel an active construction project.
   */
  private cancelProject(world: World, projectId: string, reason: string): void {
    const project = this.activeProjects.get(projectId);
    if (!project) {
      return;
    }

    // Remove the incomplete spaceship entity
    if (project.spaceshipEntityId) {
      (world as import('../ecs/World.js').WorldMutator).destroyEntity(project.spaceshipEntityId, 'construction_cancelled');
    }

    // Clear tracking
    this.activeProjects.delete(projectId);
    this.projectsByShipyard.delete(project.shipyardId);

    // Emit cancellation event
    world.eventBus.emit({
      type: 'spaceship:construction:cancelled',
      source: project.shipyardId,
      data: {
        projectId,
        shipType: project.shipType,
        shipName: project.shipName,
        shipyardId: project.shipyardId,
        builderId: project.builderId,
      },
    });
  }

  /**
   * Get all active construction projects.
   */
  public getActiveProjects(): SpaceshipConstructionProject[] {
    return Array.from(this.activeProjects.values());
  }

  /**
   * Get construction project for a specific shipyard.
   */
  public getProjectForShipyard(shipyardId: string): SpaceshipConstructionProject | undefined {
    const projectId = this.projectsByShipyard.get(shipyardId);
    if (!projectId) {
      return undefined;
    }
    return this.activeProjects.get(projectId);
  }

  /**
   * Check if a shipyard is currently building something.
   */
  public isShipyardBusy(shipyardId: string): boolean {
    return this.projectsByShipyard.has(shipyardId);
  }
}

// Singleton instance
let spaceshipConstructionSystemInstance: SpaceshipConstructionSystem | null = null;

/**
 * Get the SpaceshipConstructionSystem singleton.
 */
export function getSpaceshipConstructionSystem(): SpaceshipConstructionSystem {
  if (!spaceshipConstructionSystemInstance) {
    spaceshipConstructionSystemInstance = new SpaceshipConstructionSystem();
  }
  return spaceshipConstructionSystemInstance;
}

/**
 * Reset the SpaceshipConstructionSystem singleton (for testing).
 */
export function resetSpaceshipConstructionSystem(): void {
  spaceshipConstructionSystemInstance = null;
}
