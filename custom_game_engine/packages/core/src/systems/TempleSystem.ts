/**
 * TempleSystem - Phase 5: Religious Institutions
 *
 * Manages temples, their belief generation, and sacred site mechanics.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';

// ============================================================================
// Temple Building Configuration
// ============================================================================

export interface TempleConfig {
  /** How often to update belief bonuses (ticks) */
  updateInterval: number;

  /** Belief generation per worshipper per tick */
  baseBeliefPerWorshipper: number;

  /** Sanctity multiplier for belief */
  sanctityMultiplier: number;

  /** Range for temple influence */
  influenceRadius: number;
}

export const DEFAULT_TEMPLE_CONFIG: TempleConfig = {
  updateInterval: 600, // ~30 seconds at 20 TPS
  baseBeliefPerWorshipper: 0.5,
  sanctityMultiplier: 1.5,
  influenceRadius: 20,
};

// ============================================================================
// Temple Data Structure
// ============================================================================

export interface TempleData {
  /** Building entity ID */
  buildingId: string;

  /** Deity this temple is dedicated to */
  deityId: string;

  /** Temple name */
  name: string;

  /** Sanctity level (0-1) */
  sanctity: number;

  /** Regular worshippers (visit frequently) */
  regularWorshipperIds: Set<string>;

  /** When established */
  establishedAt: number;

  /** Last worship time */
  lastWorshipTime: number;
}

// ============================================================================
// TempleSystem
// ============================================================================

export class TempleSystem extends BaseSystem {
  public readonly id = 'TempleSystem';
  public readonly priority = 85;
  public readonly requiredComponents = [];
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = ['deity'] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private config: TempleConfig;
  private temples: Map<string, TempleData> = new Map();
  private lastUpdate: number = 0;

  constructor(config: Partial<TempleConfig> = {}) {
    super();
    this.config = { ...DEFAULT_TEMPLE_CONFIG, ...config };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Only update periodically
    if (currentTick - this.lastUpdate < this.config.updateInterval) {
      return;
    }

    this.lastUpdate = currentTick;

    // Find all temple buildings
    // Note: Temple building type may not exist yet - this is a placeholder
    // Buildings are ALWAYS simulated entities, so we iterate all
    const templeBuildings = Array.from(ctx.world.entities.values())
      .filter(e => {
        const building = e.components.get(CT.Building) as BuildingComponent | undefined;
        // Check for temple-related building types when they exist
        return building && (building.isComplete || false);
      })
      .slice(0, 0); // Disable until temple building type is added

    for (const templeEntity of templeBuildings) {
      const building = templeEntity.components.get(CT.Building) as BuildingComponent;

      // Get or create temple data
      let temple = this.temples.get(templeEntity.id);
      if (!temple) {
        temple = this.createTempleData(templeEntity.id, building, ctx.world);
        this.temples.set(templeEntity.id, temple);
      }

      // Process temple worship
      this.processTempleWorship(temple, ctx.world, currentTick);
    }
  }

  /**
   * Create temple data for a new temple building
   */
  private createTempleData(
    buildingId: string,
    _building: BuildingComponent | undefined,
    world: World
  ): TempleData {
    // Try to find which deity this temple is for
    // For now, assign to first deity we find
    const deities = Array.from(world.entities.values())
      .filter(e => e.components.has(CT.Deity));

    const firstDeity = deities[0];
    const deityId = firstDeity ? firstDeity.id : '';

    return {
      buildingId,
      deityId,
      name: 'Sacred Temple',
      sanctity: 0.5,
      regularWorshipperIds: new Set(),
      establishedAt: world.tick,
      lastWorshipTime: world.tick,
    };
  }

  /**
   * Process worship at a temple
   */
  private processTempleWorship(
    temple: TempleData,
    world: World,
    currentTick: number
  ): void {
    if (!temple.deityId) return;

    // Find deity
    const deityEntity = world.getEntity(temple.deityId);
    if (!deityEntity) return;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return;

    // Find the temple building location
    const templeEntity = world.getEntity(temple.buildingId);
    if (!templeEntity) return;

    const templePos = templeEntity.components.get(CT.Position) as PositionComponent | undefined;
    if (!templePos) return;

    // Find nearby believers
    const nearbyBelievers = this.findNearbyBelievers(
      world,
      temple.deityId,
      templePos.x,
      templePos.y
    );

    // Update regular worshippers
    temple.regularWorshipperIds = new Set(nearbyBelievers.map(e => e.id));

    // Generate belief from temple presence
    const beliefGenerated =
      nearbyBelievers.length *
      this.config.baseBeliefPerWorshipper *
      (1 + temple.sanctity * this.config.sanctityMultiplier);

    if (beliefGenerated > 0) {
      deity.addBelief(beliefGenerated, currentTick);
      temple.lastWorshipTime = currentTick;

      // Increase sanctity slightly over time with active worship
      temple.sanctity = Math.min(1, temple.sanctity + 0.001);
    }
  }

  /**
   * Find believers near a location
   */
  private findNearbyBelievers(
    world: World,
    deityId: string,
    x: number,
    y: number
  ): Array<{ id: string }> {
    const nearby: Array<{ id: string }> = [];
    const radiusSq = this.config.influenceRadius * this.config.influenceRadius;

    // Believers are agents (ALWAYS simulated), so we iterate all
    for (const entity of world.entities.values()) {
      if (!entity.components.has(CT.Agent) || !entity.components.has(CT.Spiritual)) {
        continue;
      }

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual || spiritual.believedDeity !== deityId) {
        continue;
      }

      const pos = entity.components.get(CT.Position) as PositionComponent | undefined;
      if (!pos) continue;

      const dx = pos.x - x;
      const dy = pos.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        nearby.push({ id: entity.id });
      }
    }

    return nearby;
  }

  /**
   * Get temple data for a building
   */
  getTemple(buildingId: string): TempleData | undefined {
    return this.temples.get(buildingId);
  }

  /**
   * Set temple deity
   */
  setTempleDeity(buildingId: string, deityId: string): void {
    const temple = this.temples.get(buildingId);
    if (temple) {
      temple.deityId = deityId;
    }
  }
}
