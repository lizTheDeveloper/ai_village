/**
 * ShipExteriorSystem - Manages the player ship's exterior simulation state
 *
 * This system handles:
 * - Asteroid field density based on galactic position
 * - Shield drain and recharge against asteroid fields
 * - Laser recharge
 * - Hull damage when shields are down in asteroid fields
 * - Section damage warnings at hull integrity thresholds
 *
 * Priority: 630 (after ShipCombatSystem at 620)
 * Throttle: 5 ticks (250ms at 20 TPS)
 *
 * Powers required:
 * - DEFLECTOR_ARRAY  → toggle shields
 * - PARTICLE_CANNON  → fire laser
 * - HULL_SEPARATOR   → detach sections
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType, EntityId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ShipPower, getShipPowerState } from './ShipPowers.js';
import type { ShipExteriorComponent, ShipSectionState } from './ShipExteriorComponent.js';

// ============================================================================
// Constants
// ============================================================================

/** Hull integrity thresholds that trigger section damage warnings */
const SECTION_DAMAGE_THRESHOLDS = [0.7, 0.5, 0.3] as const;

/**
 * Galactic depth scale: distance from origin beyond which field density
 * starts ramping up. Adjust as the game world scales.
 */
const DENSITY_RAMP_START = 500;
const DENSITY_RAMP_SCALE = 2000;

/** Default sections matching ShipSectionNavigation.ts */
const DEFAULT_SECTIONS: ReadonlyArray<Omit<ShipSectionState, 'isDetached' | 'detachedAt'>> = [
  { id: 'deck_1', name: 'Bridge',        deckIndex: 1, isExempt: true  },
  { id: 'deck_2', name: 'Crew Quarters', deckIndex: 2, isExempt: true  },
  { id: 'deck_3', name: 'Science Lab',   deckIndex: 3, isExempt: false },
  { id: 'deck_4', name: 'Medical Bay',   deckIndex: 4, isExempt: false },
  { id: 'deck_5', name: 'Engineering',   deckIndex: 5, isExempt: false },
  { id: 'deck_6', name: 'Cargo Hold',    deckIndex: 6, isExempt: false },
];

// ============================================================================
// System
// ============================================================================

export class ShipExteriorSystem extends BaseSystem {
  public readonly id: SystemId = 'ship_exterior' as SystemId;
  public readonly priority: number = 630;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = [CT.ShipExterior] as const;
  public readonly metadata = {
    category: 'combat' as const,
    description: 'Manages ship exterior simulation: asteroid fields, shields, lasers, hull integrity',
    dependsOn: ['ship_combat'],
    writesComponents: [CT.ShipExterior] as const,
  } as const;

  protected readonly throttleInterval = 5; // 250ms at 20 TPS

  // Performance: cache of ship entity IDs with ship_exterior components
  private shipEntityCache: EntityId[] = [];
  private cacheValidTick = -1;
  private readonly CACHE_LIFETIME = 100; // 5 seconds at 20 TPS

  // Track which thresholds have already been warned per ship to avoid flooding
  private warnedThresholds: Map<EntityId, Set<number>> = new Map();

  // ========================================================================
  // Core Update Loop
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    // Rebuild entity cache when stale
    if (ctx.tick - this.cacheValidTick > this.CACHE_LIFETIME) {
      this.rebuildCache(ctx);
      this.cacheValidTick = ctx.tick;
    }

    for (const entityId of this.shipEntityCache) {
      const entity = ctx.world.entities.get(entityId) as EntityImpl | undefined;
      if (!entity) continue;

      const exterior = entity.getComponent<ShipExteriorComponent>(CT.ShipExterior);
      if (!exterior) continue;

      this.processExterior(ctx, entity, exterior);
    }
  }

  // ========================================================================
  // Per-entity exterior simulation
  // ========================================================================

  private processExterior(
    ctx: SystemContext,
    entity: EntityImpl,
    exterior: ShipExteriorComponent
  ): void {
    let updated = { ...exterior };
    const { galacticPosition, asteroidField } = exterior;

    // --- 1. Update asteroid field density ---
    const depth = Math.sqrt(
      galacticPosition.x * galacticPosition.x +
      galacticPosition.y * galacticPosition.y +
      galacticPosition.z * galacticPosition.z
    );
    const newDensity = this.computeAsteroidDensity(depth);
    updated = {
      ...updated,
      asteroidField: {
        ...asteroidField,
        density: newDensity,
        asteroidCount: Math.round(newDensity * 100),
      },
    };

    const asteroidsPresent = updated.asteroidField.density > 0;

    // --- 2. Shield drain / recharge ---
    if (updated.shieldActive && asteroidsPresent) {
      const drained = updated.shieldStrength - updated.asteroidField.damagePerTick;
      if (drained <= 0) {
        updated = { ...updated, shieldStrength: 0, shieldActive: false };
        ctx.emit('ship:shield_depleted', {}, entity.id);
      } else {
        updated = { ...updated, shieldStrength: drained };
      }
    } else if (!asteroidsPresent || !updated.shieldActive) {
      // Recharge when no asteroids are draining it, or shield is off
      if (updated.shieldStrength < updated.shieldMaxStrength) {
        updated = {
          ...updated,
          shieldStrength: Math.min(
            updated.shieldMaxStrength,
            updated.shieldStrength + updated.shieldRechargeRate
          ),
        };
      }
    }

    // --- 3. Laser recharge ---
    if (updated.laserCharge < updated.laserMaxCharge) {
      updated = {
        ...updated,
        laserCharge: Math.min(
          updated.laserMaxCharge,
          updated.laserCharge + updated.laserRechargeRate
        ),
      };
    }

    // --- 4. Hull damage when shields are down and asteroids present ---
    if (!updated.shieldActive && asteroidsPresent) {
      const damage = updated.asteroidField.damagePerTick;
      const newIntegrity = Math.max(0, updated.hullIntegrity - damage);
      updated = { ...updated, hullIntegrity: newIntegrity };

      const severity = this.classifyDamageSeverity(newIntegrity);
      ctx.emit(
        'ship:hull_damage',
        {
          severity,
          integrity: newIntegrity,
        },
        entity.id
      );

      ctx.emit(
        'ship:asteroid_impact',
        {
          damage,
          shielded: false,
        },
        entity.id
      );

      // --- 5. Section damage warnings at thresholds ---
      this.checkSectionDamageWarnings(ctx, entity.id, newIntegrity);
    } else if (updated.shieldActive && asteroidsPresent) {
      // Emit impact event even when shield absorbed it
      ctx.emit(
        'ship:asteroid_impact',
        {
          damage: updated.asteroidField.damagePerTick,
          shielded: true,
        },
        entity.id
      );
    }

    // Persist updated component
    entity.updateComponent<ShipExteriorComponent>(CT.ShipExterior, () => updated);
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  /**
   * Compute asteroid density based on galactic depth.
   * Deeper = denser, per board decision.
   */
  private computeAsteroidDensity(depth: number): number {
    if (depth <= DENSITY_RAMP_START) return 0;
    const raw = (depth - DENSITY_RAMP_START) / DENSITY_RAMP_SCALE;
    return Math.min(1, raw);
  }

  /**
   * Convert hull integrity to a severity level (1–4: minor, moderate, severe, critical).
   * Matches the numeric severity expected by the ship:hull_damage event.
   */
  private classifyDamageSeverity(hullIntegrity: number): number {
    if (hullIntegrity > 0.7) return 1; // minor
    if (hullIntegrity > 0.5) return 2; // moderate
    if (hullIntegrity > 0.3) return 3; // severe
    return 4;                           // critical
  }

  private checkSectionDamageWarnings(ctx: SystemContext, shipId: EntityId, hullIntegrity: number): void {
    if (!this.warnedThresholds.has(shipId)) {
      this.warnedThresholds.set(shipId, new Set());
    }
    const warned = this.warnedThresholds.get(shipId)!;

    for (const threshold of SECTION_DAMAGE_THRESHOLDS) {
      if (hullIntegrity <= threshold && !warned.has(threshold)) {
        warned.add(threshold);
        ctx.emit(
          'ship:section_damage_warning',
          { threshold, integrity: hullIntegrity },
          shipId
        );
      }
    }
  }

  private rebuildCache(ctx: SystemContext): void {
    this.shipEntityCache = [];
    for (const entity of ctx.world.entities.values()) {
      if (entity.hasComponent(CT.ShipExterior)) {
        this.shipEntityCache.push(entity.id);
      }
    }
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Initialize the ship_exterior component on a ship entity with default values.
   */
  public initializeExterior(world: World, shipEntity: EntityImpl): ShipExteriorComponent {
    if (shipEntity.hasComponent(CT.ShipExterior)) {
      throw new Error(`[ShipExteriorSystem] Entity ${shipEntity.id} already has a ship_exterior component`);
    }

    const defaultSections: ShipSectionState[] = DEFAULT_SECTIONS.map((s) => ({
      ...s,
      isDetached: false,
    }));

    const component: ShipExteriorComponent = {
      type: 'ship_exterior',
      version: 1,
      viewActive: false,
      galacticPosition: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      asteroidField: {
        density: 0,
        damagePerTick: 0.005,
        asteroidCount: 0,
      },
      shieldActive: false,
      shieldStrength: 1,
      shieldMaxStrength: 1,
      shieldRechargeRate: 0.01,
      laserActive: false,
      laserCharge: 1,
      laserMaxCharge: 1,
      laserRechargeRate: 0.02,
      laserDamage: 0.2,
      hullIntegrity: 1,
      detachableSections: defaultSections,
    };

    shipEntity.addComponent(component);
    return component;
  }

  /**
   * Toggle shield on/off. Requires DEFLECTOR_ARRAY power.
   */
  public toggleShield(world: World, shipEntity: EntityImpl): void {
    const powers = getShipPowerState();
    if (!powers.isUnlocked(ShipPower.DEFLECTOR_ARRAY)) {
      throw new Error('[ShipExteriorSystem] DEFLECTOR_ARRAY power is not unlocked');
    }

    const exterior = shipEntity.getComponent<ShipExteriorComponent>(CT.ShipExterior);
    if (!exterior) {
      throw new Error(`[ShipExteriorSystem] Entity ${shipEntity.id} has no ship_exterior component`);
    }

    shipEntity.updateComponent<ShipExteriorComponent>(CT.ShipExterior, (current) => ({
      ...current,
      shieldActive: !current.shieldActive,
    }));
  }

  /**
   * Fire laser at nearest asteroid. Requires PARTICLE_CANNON power and sufficient charge.
   * Reduces asteroid density by laser damage amount.
   */
  public fireLaser(world: World, shipEntity: EntityImpl): void {
    const powers = getShipPowerState();
    if (!powers.isUnlocked(ShipPower.PARTICLE_CANNON)) {
      throw new Error('[ShipExteriorSystem] PARTICLE_CANNON power is not unlocked');
    }

    const exterior = shipEntity.getComponent<ShipExteriorComponent>(CT.ShipExterior);
    if (!exterior) {
      throw new Error(`[ShipExteriorSystem] Entity ${shipEntity.id} has no ship_exterior component`);
    }
    if (exterior.laserCharge < exterior.laserDamage) {
      throw new Error(
        `[ShipExteriorSystem] Insufficient laser charge: ${exterior.laserCharge} < ${exterior.laserDamage}`
      );
    }
    if (exterior.asteroidField.density <= 0) {
      throw new Error('[ShipExteriorSystem] No asteroids to fire at');
    }

    shipEntity.updateComponent<ShipExteriorComponent>(CT.ShipExterior, (current) => ({
      ...current,
      laserActive: true,
      laserCharge: current.laserCharge - current.laserDamage,
      asteroidField: {
        ...current.asteroidField,
        density: Math.max(0, current.asteroidField.density - current.laserDamage * 0.1),
        asteroidCount: Math.max(0, current.asteroidField.asteroidCount - 1),
      },
    }));
  }

  /**
   * Detach a ship section. Requires HULL_SEPARATOR power.
   * Command module (deck_1) and adjacent section (deck_2) are always exempt.
   */
  public detachSection(world: World, shipEntity: EntityImpl, sectionId: string): void {
    const powers = getShipPowerState();
    if (!powers.isUnlocked(ShipPower.HULL_SEPARATOR)) {
      throw new Error('[ShipExteriorSystem] HULL_SEPARATOR power is not unlocked');
    }

    const exterior = shipEntity.getComponent<ShipExteriorComponent>(CT.ShipExterior);
    if (!exterior) {
      throw new Error(`[ShipExteriorSystem] Entity ${shipEntity.id} has no ship_exterior component`);
    }

    const sectionIndex = exterior.detachableSections.findIndex((s) => s.id === sectionId);
    if (sectionIndex === -1) {
      throw new Error(`[ShipExteriorSystem] Section '${sectionId}' not found`);
    }

    const section = exterior.detachableSections[sectionIndex]!;
    if (section.isExempt) {
      throw new Error(`[ShipExteriorSystem] Section '${sectionId}' (${section.name}) is exempt from detachment`);
    }
    if (section.isDetached) {
      throw new Error(`[ShipExteriorSystem] Section '${sectionId}' is already detached`);
    }

    const tick = world.tick;
    const updatedSections = exterior.detachableSections.map((s, i) =>
      i === sectionIndex ? { ...s, isDetached: true, detachedAt: tick } : s
    );

    shipEntity.updateComponent<ShipExteriorComponent>(CT.ShipExterior, (current) => ({
      ...current,
      detachableSections: updatedSections,
    }));

    // Emit via world event bus directly (we may not have a ctx here)
    world.eventBus.emit({
      type: 'ship:section_detached',
      source: shipEntity.id,
      data: {
        sectionId: section.id,
        sectionName: section.name,
        deckIndex: section.deckIndex,
      },
    });
  }

  /**
   * Return a copy of the current ShipExteriorComponent for the given entity.
   */
  public getExteriorState(world: World, shipEntity: EntityImpl): ShipExteriorComponent {
    const exterior = shipEntity.getComponent<ShipExteriorComponent>(CT.ShipExterior);
    if (!exterior) {
      throw new Error(`[ShipExteriorSystem] Entity ${shipEntity.id} has no ship_exterior component`);
    }
    return exterior;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: ShipExteriorSystem | null = null;

export function getShipExteriorSystem(): ShipExteriorSystem {
  if (!instance) {
    instance = new ShipExteriorSystem();
  }
  return instance;
}
