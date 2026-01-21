/**
 * SimulationScheduler - Dwarf Fortress-style entity simulation management
 *
 * Manages which entities are actively simulated based on:
 * - Simulation mode (ALWAYS, PROXIMITY, PASSIVE)
 * - Distance from agents/camera
 * - Update frequency throttling
 *
 * This dramatically reduces per-tick processing by:
 * - Freezing off-screen entities (plants, wild animals)
 * - Making resources event-driven only (no per-tick cost)
 * - Only simulating ~50-100 entities instead of 4,000+
 */

import type { Entity } from './Entity.js';
import type { World } from './World.js';
import type { ComponentType } from '../types/ComponentType.js';
import { NDimensionalSpatialGrid } from '../utils/NDimensionalSpatialGrid.js';
import {
  canPotentiallySee,
  getEffectiveRange,
  distanceSquaredND,
  getCoordinates,
} from '../utils/VisibilityUtils.js';
import type { UniversePhysicsConfig } from '../config/UniversePhysicsConfig.js';
import { STANDARD_3D_CONFIG } from '../config/UniversePhysicsConfig.js';

/**
 * Simulation modes determine when an entity is updated
 */
export enum SimulationMode {
  /**
   * ALWAYS - Critical entities that must always simulate
   * Examples: agents, buildings, tame animals, quest items
   */
  ALWAYS = 'always',

  /**
   * PROXIMITY - Only simulate when near agents (on-screen)
   * Examples: wild animals, plants
   * Freezes when off-screen to save processing
   */
  PROXIMITY = 'proximity',

  /**
   * PASSIVE - Never in update loops, only react to events
   * Examples: resources, items, corpses
   * Zero per-tick cost - only process when interacted with
   */
  PASSIVE = 'passive',
}

/**
 * Configuration for how a component type should be simulated
 */
export interface ComponentSimulationConfig {
  /** Simulation mode */
  mode: SimulationMode;

  /** For PROXIMITY mode: range in tiles to check (default: 15) */
  range?: number;

  /** Update frequency in ticks when active (default: every tick) */
  updateFrequency?: number;

  /** If true, always simulate even when far from agents */
  essential?: boolean;
}

/**
 * Default simulation configurations for component types
 *
 * These define the performance characteristics of the game:
 * - ALWAYS: ~20 entities (agents, buildings)
 * - PROXIMITY: ~100 entities (visible plants/animals)
 * - PASSIVE: ~3,500 entities (resources, zero cost)
 */
export const SIMULATION_CONFIGS: Record<string, ComponentSimulationConfig> = {
  // ============================================================================
  // ALWAYS - Critical entities (always simulate)
  // ============================================================================

  agent: { mode: SimulationMode.ALWAYS },
  building: { mode: SimulationMode.ALWAYS },
  deity: { mode: SimulationMode.ALWAYS },
  avatar: { mode: SimulationMode.ALWAYS },
  angel: { mode: SimulationMode.ALWAYS },

  // Tame animals always simulate (player investment)
  // Wild animals handled separately with 'animal' component

  // ============================================================================
  // PROXIMITY - Only when on-screen (near agents)
  // ============================================================================

  /** Plants only grow when visible */
  plant: {
    mode: SimulationMode.PROXIMITY,
    range: 15,
    updateFrequency: 86400, // Daily updates when visible
  },

  /** Wild animals freeze when off-screen */
  animal: {
    mode: SimulationMode.PROXIMITY,
    range: 15,
  },

  /** Seeds only germinate when visible */
  seed: {
    mode: SimulationMode.PROXIMITY,
    range: 15,
  },

  // ============================================================================
  // PASSIVE - Event-driven only (zero per-tick cost)
  // ============================================================================

  /** Resources need spatial indexing for gathering but don't need updates */
  resource: {
    mode: SimulationMode.PROXIMITY,
    range: 200, // Large range for chunk indexing
    updateFrequency: Infinity, // Never update (event-driven)
  },

  /** VoxelResource also needs spatial indexing */
  voxel_resource: {
    mode: SimulationMode.PROXIMITY,
    range: 200,
    updateFrequency: Infinity,
  },

  /** Items are passive until picked up */
  inventory: { mode: SimulationMode.PASSIVE },

  // ============================================================================
  // Reproductive & Communication - Always simulate
  // ============================================================================

  /** Pregnancy should progress even off-screen */
  pregnancy: { mode: SimulationMode.ALWAYS },
  labor: { mode: SimulationMode.ALWAYS },
  postpartum: { mode: SimulationMode.ALWAYS },
  infant: { mode: SimulationMode.ALWAYS },
  nursing: { mode: SimulationMode.ALWAYS },

  /** Cross-realm phones work anywhere */
  cross_realm_phone: { mode: SimulationMode.ALWAYS },

  // ============================================================================
  // Player Investments - Always simulate (work off-screen)
  // ============================================================================

  /** Robots are player-built automation - should work off-screen */
  robot: { mode: SimulationMode.ALWAYS },

  /** Spaceships are player vehicles - should stay operational */
  spaceship: { mode: SimulationMode.ALWAYS },

  /** Military units should remain active */
  squad: { mode: SimulationMode.ALWAYS },
  fleet: { mode: SimulationMode.ALWAYS },
  armada: { mode: SimulationMode.ALWAYS },

  // ============================================================================
  // Important entities - Always simulate
  // ============================================================================

  /** Spirits have religious significance */
  spirit: { mode: SimulationMode.ALWAYS },

  /** Companions are special to the player */
  companion: { mode: SimulationMode.ALWAYS },

  // ============================================================================
  // Items and Equipment - Passive (zero per-tick cost)
  // ============================================================================

  /** Items don't need per-tick updates */
  item: { mode: SimulationMode.PASSIVE },

  /** Equipment is passive until used */
  equipment: { mode: SimulationMode.PASSIVE },

  /** Corpses don't need frequent updates */
  corpse: {
    mode: SimulationMode.PROXIMITY,
    range: 15,
    updateFrequency: 86400, // Daily decay check
  },

  // ============================================================================
  // Special cases - can override based on entity tags
  // ============================================================================

  // Default to PROXIMITY for unlisted components
};

/**
 * Get simulation config for a component type
 */
export function getSimulationConfig(componentType: ComponentType): ComponentSimulationConfig {
  return SIMULATION_CONFIGS[componentType] || {
    mode: SimulationMode.PROXIMITY,
    range: 15,
  };
}

/**
 * Check if an entity has any ALWAYS components
 */
export function isAlwaysActive(entity: Entity): boolean {
  for (const [componentType] of entity.components.entries()) {
    const config = getSimulationConfig(componentType as ComponentType);
    if (config.mode === SimulationMode.ALWAYS) {
      return true;
    }
  }
  return false;
}

/**
 * Check if an entity should be simulated based on proximity to agents
 */
export function isInSimulationRange(
  entity: Entity,
  agentPositions: Array<{ x: number; y: number; z?: number }>,
  range: number = 15,
  physicsConfig: UniversePhysicsConfig = STANDARD_3D_CONFIG
): boolean {
  // Get entity position
  const positionComponent = entity.components.get('position');
  if (!positionComponent || typeof positionComponent !== 'object') return false;

  // Type guard: check that position has required fields
  if (!('x' in positionComponent) || !('y' in positionComponent)) return false;

  const position = positionComponent as { x: number; y: number; z?: number; w?: number; v?: number; u?: number };
  if (!position) return false;

  const entityZ = position.z ?? 0;

  // Check if within range of any agent
  for (const agentPos of agentPositions) {
    const agentZ = agentPos.z ?? 0;

    // Fast pre-filter: Check underground isolation (hard boundary at z=0)
    if (physicsConfig.undergroundIsolation && !canPotentiallySee(agentZ, entityZ)) {
      continue; // Different isolation layers, skip this agent
    }

    // Calculate effective range with horizon bonus for flying entities
    const effectiveRange = getEffectiveRange(range, agentZ, physicsConfig.planetRadius);

    // N-dimensional distance calculation
    const agentCoords = getCoordinates(
      { x: agentPos.x, y: agentPos.y, z: agentZ },
      physicsConfig.spatialDimensions
    );
    const entityCoords = getCoordinates(position, physicsConfig.spatialDimensions);
    const distanceSquared = distanceSquaredND(agentCoords, entityCoords);

    if (distanceSquared <= effectiveRange * effectiveRange) {
      return true;
    }
  }

  return false;
}

/**
 * SimulationScheduler manages which entities are actively simulated
 */
export class SimulationScheduler {
  /** Cache of agent positions for proximity checks */
  private agentPositions: Array<{ x: number; y: number; z?: number }> = [];

  /** Last update tick per entity (for frequency throttling) */
  private lastUpdateTick: Map<string, number> = new Map();

  /** Feature flag for N-D spatial grid (can disable for debugging) */
  private useNDSpatialGrid: boolean = true;

  /** N-dimensional spatial grid for O(1) proximity queries */
  private spatialGrid: NDimensionalSpatialGrid | null = null;

  /** Universe physics configuration */
  private physicsConfig: UniversePhysicsConfig = STANDARD_3D_CONFIG;

  /**
   * Configure universe physics for visibility calculations
   */
  setPhysicsConfig(config: UniversePhysicsConfig): void {
    this.physicsConfig = config;
    // Recreate spatial grid with new dimensions
    if (this.useNDSpatialGrid) {
      this.spatialGrid = new NDimensionalSpatialGrid(
        config.spatialDimensions,
        Math.max(...config.defaultVisibilityRange)
      );
    }
  }

  /**
   * Update agent position cache
   * Called once per tick before filtering entities
   */
  updateAgentPositions(world: World): void {
    this.agentPositions = [];

    const agents = world.query().with('agent' as ComponentType).with('position' as ComponentType).executeEntities();
    for (const agent of agents) {
      const positionComponent = agent.components.get('position');
      if (!positionComponent || typeof positionComponent !== 'object') continue;
      if (!('x' in positionComponent) || !('y' in positionComponent)) continue;

      const position = positionComponent as { x: number; y: number; z?: number };
      this.agentPositions.push({ x: position.x, y: position.y, z: position.z });
    }

    // Update spatial grid with current entity positions
    if (this.useNDSpatialGrid && this.spatialGrid) {
      this.spatialGrid.clear();

      // Add all entities with positions to the spatial grid
      for (const entity of world.entities.values()) {
        const positionComponent = entity.components.get('position');
        if (!positionComponent || typeof positionComponent !== 'object') continue;
        if (!('x' in positionComponent) || !('y' in positionComponent)) continue;

        const position = positionComponent as { x: number; y: number; z?: number; w?: number; v?: number; u?: number };
        const coords = getCoordinates(position, this.physicsConfig.spatialDimensions);
        this.spatialGrid.add(entity.id, coords);
      }
    }
  }

  /**
   * Filter entities for a system based on simulation rules
   *
   * @param entities - All entities with required components
   * @param currentTick - Current world tick
   * @returns Filtered entities that should be simulated this tick
   */
  filterActiveEntities(entities: readonly Entity[], currentTick: number): Entity[] {
    const activeEntities: Entity[] = [];

    for (const entity of entities) {
      // Check if entity should be simulated
      if (this.shouldSimulate(entity, currentTick)) {
        activeEntities.push(entity);
      }
    }

    return activeEntities;
  }

  /**
   * Check if an entity should be simulated this tick
   */
  private shouldSimulate(entity: Entity, currentTick: number): boolean {
    // Determine simulation mode based on components
    let mode = SimulationMode.PASSIVE;
    let range = 15;
    let updateFrequency = 1;
    let isEssential = false;

    // Check all components to find the most permissive simulation mode
    for (const [componentType] of entity.components.entries()) {
      const config = getSimulationConfig(componentType as ComponentType);

      // ALWAYS takes precedence
      if (config.mode === SimulationMode.ALWAYS || config.essential) {
        mode = SimulationMode.ALWAYS;
        isEssential = true;
        break;
      }

      // PROXIMITY takes precedence over PASSIVE
      if (config.mode === SimulationMode.PROXIMITY && mode === SimulationMode.PASSIVE) {
        mode = SimulationMode.PROXIMITY;
        range = config.range || 15;
        updateFrequency = config.updateFrequency || 1;
      }
    }

    // Check for runtime essential status (dynamic conditions)
    if (!isEssential) {
      isEssential = this.isEntityEssential(entity);
    }

    // Essential entities are promoted to ALWAYS mode
    if (isEssential && mode === SimulationMode.PROXIMITY) {
      mode = SimulationMode.ALWAYS;
    }

    // ALWAYS entities always simulate
    if (mode === SimulationMode.ALWAYS) {
      return this.checkUpdateFrequency(entity.id, currentTick, updateFrequency);
    }

    // PASSIVE entities never simulate (event-driven only)
    if (mode === SimulationMode.PASSIVE) {
      return false;
    }

    // PROXIMITY entities only simulate when near agents
    if (mode === SimulationMode.PROXIMITY) {
      // If no agents exist (e.g., in tests), simulate all PROXIMITY entities
      // In production, agentPositions will always have at least one agent
      if (this.agentPositions.length === 0) {
        return this.checkUpdateFrequency(entity.id, currentTick, updateFrequency);
      }

      if (!isInSimulationRange(entity, this.agentPositions, range, this.physicsConfig)) {
        return false; // Off-screen, freeze simulation
      }

      return this.checkUpdateFrequency(entity.id, currentTick, updateFrequency);
    }

    return false;
  }

  /**
   * Check if an entity is essential and should always be simulated
   *
   * Essential entities include:
   * - Entities in active conversations
   * - Tamed animals
   * - Animals with owners
   * - Companion entities
   */
  private isEntityEssential(entity: Entity): boolean {
    // Check for active conversation
    const conversationComponent = entity.components.get('conversation');
    if (conversationComponent && typeof conversationComponent === 'object') {
      const conversation = conversationComponent as { isActive?: boolean };
      if (conversation.isActive === true) {
        return true; // Active conversation participant
      }
    }

    // Check for tamed animals or animals with owners
    const animalComponent = entity.components.get('animal');
    if (animalComponent && typeof animalComponent === 'object') {
      const animal = animalComponent as { wild?: boolean; ownerId?: string };
      if (animal.wild === false || animal.ownerId !== undefined) {
        return true; // Tamed animal or has owner
      }
    }

    // Check for companion component (Ophanim companion)
    if (entity.components.has('companion')) {
      return true; // Companion is always essential
    }

    return false;
  }

  /**
   * Check if entity is due for update based on frequency throttling
   */
  private checkUpdateFrequency(entityId: string, currentTick: number, frequency: number): boolean {
    if (frequency <= 1) return true; // Update every tick

    const lastTick = this.lastUpdateTick.get(entityId) || 0;
    const ticksSinceUpdate = currentTick - lastTick;

    if (ticksSinceUpdate >= frequency) {
      this.lastUpdateTick.set(entityId, currentTick);
      return true;
    }

    return false;
  }

  /**
   * Mark entity as updated (for manual frequency tracking)
   */
  markUpdated(entityId: string, currentTick: number): void {
    this.lastUpdateTick.set(entityId, currentTick);
  }

  /**
   * Get stats for debugging/monitoring
   */
  getStats(world: World): {
    alwaysCount: number;
    proximityActiveCount: number;
    proximityFrozenCount: number;
    passiveCount: number;
    totalEntities: number;
  } {
    let alwaysCount = 0;
    let proximityActiveCount = 0;
    let proximityFrozenCount = 0;
    let passiveCount = 0;

    for (const entity of world.entities.values()) {
      if (isAlwaysActive(entity)) {
        alwaysCount++;
      } else {
        // Check dominant mode
        let hasProximity = false;
        let hasPassive = false;

        for (const [componentType] of entity.components.entries()) {
          const config = getSimulationConfig(componentType as ComponentType);
          if (config.mode === SimulationMode.PROXIMITY) hasProximity = true;
          if (config.mode === SimulationMode.PASSIVE) hasPassive = true;
        }

        if (hasProximity) {
          if (isInSimulationRange(entity, this.agentPositions, 15, this.physicsConfig)) {
            proximityActiveCount++;
          } else {
            proximityFrozenCount++;
          }
        } else if (hasPassive) {
          passiveCount++;
        }
      }
    }

    return {
      alwaysCount,
      proximityActiveCount,
      proximityFrozenCount,
      passiveCount,
      totalEntities: world.entities.size,
    };
  }
}
