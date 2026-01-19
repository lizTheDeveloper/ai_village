/**
 * TerrainModificationSystem - Phase 9: World Impact
 *
 * Allows deities to modify the world's terrain.
 * Terrain powers include:
 * - Raising/lowering terrain
 * - Creating water features (rivers, lakes)
 * - Growing forests
 * - Creating sacred groves
 * - Altering soil fertility
 * - Creating landmarks (mountains, valleys)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';

// ============================================================================
// Terrain Modification Types
// ============================================================================

export interface TerrainModification {
  id: string;

  /** Deity who performed the modification */
  deityId: string;

  /** Type of modification */
  type: TerrainModificationType;

  /** Location */
  location: { x: number; y: number };

  /** Radius of effect */
  radius: number;

  /** When performed */
  performedAt: number;

  /** Belief cost */
  cost: number;

  /** Magnitude (0-1) */
  magnitude: number;

  /** Permanent or temporary? */
  permanent: boolean;

  /** If temporary, duration in ticks */
  duration?: number;

  /** Status */
  status: 'active' | 'completed' | 'fading';
}

export type TerrainModificationType =
  | 'raise_land'           // Raise terrain elevation
  | 'lower_land'           // Lower terrain elevation
  | 'create_water'         // Create water feature
  | 'drain_water'          // Remove water
  | 'grow_forest'          // Create/expand forest
  | 'clear_forest'         // Remove forest
  | 'fertilize_soil'       // Increase fertility
  | 'blight_soil'          // Decrease fertility
  | 'create_mountain'      // Create significant elevation
  | 'create_valley'        // Create depression
  | 'sacred_grove'         // Create blessed area
  | 'cursed_ground';       // Create cursed area

// ============================================================================
// Power Configuration
// ============================================================================

export interface TerrainPowerConfig {
  /** How often to process terrain modifications (ticks) */
  updateInterval: number;

  /** Base costs for each power */
  powerCosts: Record<TerrainModificationType, number>;

  /** Minimum belief required to use terrain powers */
  minBeliefForPowers: number;
}

export const DEFAULT_TERRAIN_POWER_CONFIG: TerrainPowerConfig = {
  updateInterval: 100, // ~5 seconds at 20 TPS
  minBeliefForPowers: 1000,
  powerCosts: {
    raise_land: 500,
    lower_land: 400,
    create_water: 600,
    drain_water: 500,
    grow_forest: 300,
    clear_forest: 200,
    fertilize_soil: 400,
    blight_soil: 350,
    create_mountain: 2000,
    create_valley: 1500,
    sacred_grove: 1000,
    cursed_ground: 800,
  },
};

// ============================================================================
// TerrainModificationSystem
// ============================================================================

export class TerrainModificationSystem extends BaseSystem {
  public readonly id = 'TerrainModificationSystem';
  public readonly priority = 70;
  public readonly requiredComponents = [];
  // Lazy activation: Skip entire system when no terrain_modification exists
  public readonly activationComponents = ['terrain_modification'] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private config: TerrainPowerConfig;
  private modifications: Map<string, TerrainModification> = new Map();

  // Precomputed cost lookup tables (avoid repeated calculations)
  private readonly baseCostLookup: Map<TerrainModificationType, number> = new Map();

  // Reusable working objects (zero allocation)
  private readonly workingDistanceCalc = { dx: 0, dy: 0, distSq: 0 };

  constructor(config: Partial<TerrainPowerConfig> = {}) {
    super();
    this.config = {
      ...DEFAULT_TERRAIN_POWER_CONFIG,
      ...config,
      powerCosts: { ...DEFAULT_TERRAIN_POWER_CONFIG.powerCosts, ...config.powerCosts },
    };
  }

  protected onInitialize(): void {
    // Precompute base costs for all power types
    const types: TerrainModificationType[] = [
      'raise_land', 'lower_land', 'create_water', 'drain_water',
      'grow_forest', 'clear_forest', 'fertilize_soil', 'blight_soil',
      'create_mountain', 'create_valley', 'sacred_grove', 'cursed_ground'
    ];

    for (const type of types) {
      this.baseCostLookup.set(type, this.config.powerCosts[type]);
    }
  }

  protected onUpdate(ctx: SystemContext): void {
    // Early exit: no modifications to process
    if (this.modifications.size === 0) {
      return;
    }

    // Process ongoing terrain modifications
    this.processModifications(ctx.world, ctx.tick);
  }

  /**
   * Perform a terrain modification
   */
  modifyTerrain(
    deityId: string,
    world: World,
    type: TerrainModificationType,
    location: { x: number; y: number },
    radius: number = 5,
    magnitude: number = 1.0,
    permanent: boolean = true,
    duration?: number
  ): TerrainModification | null {
    // Find deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Check if deity has enough belief
    const cost = this.calculateCost(type, radius, magnitude);

    if (!deity.spendBelief(cost)) {
      return null;
    }

    // Create modification
    const modification: TerrainModification = {
      id: `terrain_mod_${Date.now()}`,
      deityId,
      type,
      location,
      radius,
      performedAt: world.tick,
      cost,
      magnitude,
      permanent,
      duration,
      status: 'active',
    };

    this.modifications.set(modification.id, modification);

    // Apply the modification
    this.applyModification(world, modification);

    // Emit terrain modified event (using generic since not in EventMap)
    if (this.events) {
      this.events.emitGeneric('terrain_modified', {
        modificationId: modification.id,
        deityId,
        type,
        location,
        radius,
        magnitude,
      });
    }

    return modification;
  }

  /**
   * Calculate cost for a modification (optimized with lookup table)
   */
  private calculateCost(
    type: TerrainModificationType,
    radius: number,
    magnitude: number
  ): number {
    // Use precomputed base cost
    const baseCost = this.baseCostLookup.get(type)!;

    // Scale by radius (quadratic) - avoid division in hot path
    const radiusScale = radius * 0.2; // radius / 5
    const radiusCost = baseCost * radiusScale * radiusScale;

    // Scale by magnitude
    const magnitudeCost = radiusCost * magnitude;

    return Math.floor(magnitudeCost);
  }

  /**
   * Apply a terrain modification to the world
   */
  private applyModification(_world: World, modification: TerrainModification): void {
    // In full implementation, would modify terrain data structures
    // For now, just track the modification

    // Example of what would happen:
    switch (modification.type) {
      case 'raise_land':
        // Increase elevation in radius
        break;

      case 'create_water':
        // Add water tiles in radius
        break;

      case 'grow_forest':
        // Spawn trees in radius
        break;

      case 'fertilize_soil':
        // Increase soil quality in radius
        break;

      case 'sacred_grove':
        // Mark area as sacred, apply bonuses
        break;

      default:
        break;
    }

    modification.status = 'completed';
  }

  /**
   * Process ongoing modifications (optimized single-pass iteration)
   */
  private processModifications(_world: World, currentTick: number): void {
    // Early exit: no modifications
    if (this.modifications.size === 0) {
      return;
    }

    // Single pass: check for expiration (use Array.from for ES5 compatibility)
    const modificationsArray = Array.from(this.modifications.values());
    for (const modification of modificationsArray) {
      // Skip non-active modifications
      if (modification.status !== 'active') continue;

      // Check if temporary modification should expire
      if (!modification.permanent && modification.duration) {
        const elapsed = currentTick - modification.performedAt;

        if (elapsed >= modification.duration) {
          modification.status = 'fading';
          // In full implementation, would reverse the modification
        }
      }
    }
  }

  /**
   * Get modification
   */
  getModification(modId: string): TerrainModification | undefined {
    return this.modifications.get(modId);
  }

  /**
   * Get all modifications by a deity
   */
  getModificationsBy(deityId: string): TerrainModification[] {
    return Array.from(this.modifications.values())
      .filter(m => m.deityId === deityId);
  }

  /**
   * Get modifications in an area (optimized with squared distance)
   */
  getModificationsInArea(
    location: { x: number; y: number },
    radius: number
  ): TerrainModification[] {
    // Early exit: no modifications
    if (this.modifications.size === 0) {
      return [];
    }

    const results: TerrainModification[] = [];
    const radiusSq = radius * radius;

    // Use Array.from for ES5 compatibility
    const modificationsArray = Array.from(this.modifications.values());
    for (const m of modificationsArray) {
      // Use reusable working object to avoid allocations
      this.workingDistanceCalc.dx = m.location.x - location.x;
      this.workingDistanceCalc.dy = m.location.y - location.y;
      this.workingDistanceCalc.distSq =
        this.workingDistanceCalc.dx * this.workingDistanceCalc.dx +
        this.workingDistanceCalc.dy * this.workingDistanceCalc.dy;

      // Use squared distance to avoid sqrt (expensive)
      const combinedRadius = radius + m.radius;
      const combinedRadiusSq = combinedRadius * combinedRadius;

      if (this.workingDistanceCalc.distSq <= combinedRadiusSq) {
        results.push(m);
      }
    }

    return results;
  }
}
