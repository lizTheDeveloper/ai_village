import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { NeedsComponent } from '../components/NeedsComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { calculatePressure, calculateLightLevel } from '@ai-village/world';
import type { StateMutatorSystem } from './StateMutatorSystem.js';

/**
 * AgentSwimmingSystem - Depth-based swimming mechanics with oxygen and pressure
 *
 * Implements realistic ocean depth penalties from PLANETARY_WATER_PHYSICS_SPEC.md:
 * - Epipelagic (0-200m): Normal swimming, 50% speed, low oxygen drain
 * - Mesopelagic (200-1000m): Slower (30%), vision limited without light
 * - Bathypelagic (1000-4000m): Very slow (10%), pressure damage begins
 * - Abyssal (4000-6000m): Extreme difficulty (5%), rapid oxygen loss
 * - Hadal (6000+m): Death without specialized deep-sea suit
 *
 * Oxygen mechanics:
 * - Agents have oxygen capacity (stored in needs.oxygen, 0-1)
 * - Drain rate increases with depth
 * - Oxygen = 0 → drowning damage (1% health per second)
 * - Surface breathing: refills oxygen instantly
 *
 * Pressure mechanics:
 * - Pressure = 1 ATM per 10m depth (P = ρgh)
 * - Unprotected agents take damage in deep water
 * - Specialized equipment resists pressure (see EquipmentComponent)
 *
 * Equipment:
 * - Light source: Mitigates vision penalty in mesopelagic
 * - Deep-sea suit: Protects from pressure in abyssal/hadal zones
 * - Oxygen tank: Extends breath capacity
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Throttled to update every 20 ticks (1 second) instead of every tick
 * - Tracks underwaterEntities Set - only processes entities actually in water!
 * - Uses SimulationScheduler to only process active entities
 * - Caches tile lookups - only rechecks when entity moves to different tile
 * - Uses StateMutatorSystem for gradual oxygen drain and pressure damage
 *   (Applied once per game minute, not every tick)
 * - Only sets movement speed multiplier when depth zone changes
 *
 * Performance: Typically processes ~0-5 underwater entities instead of 4000+ total entities
 *
 * Future enhancements:
 * - Decompression sickness (rapid ascent)
 * - Bioluminescent creatures (provide light)
 * - Pressure-adapted aquatic species (no penalties)
 */
export class AgentSwimmingSystem implements System {
  public readonly id: SystemId = 'agent_swimming';
  public readonly priority: number = 18; // After fluid dynamics (16), planetary currents (17)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Agent,    // Only process agents, not animals or other entities
    CT.Position,
    CT.Movement,
    CT.Needs,
  ];

  // Throttling: Update every 20 ticks (1 second at 20 TPS)
  private readonly UPDATE_INTERVAL = 20;
  private lastUpdateTick = 0;

  // Reference to StateMutatorSystem for registering deltas
  private stateMutatorSystem: StateMutatorSystem | null = null;

  // Track entities currently in water - only process these!
  private underwaterEntities = new Set<string>();

  // Track active delta cleanup functions per entity
  private activeDeltaCleanups = new Map<
    string,
    {
      oxygen?: () => void;
      drowning?: () => void;
      pressure?: () => void;
      lastDepthZone?: string;
    }
  >();

  // Cache tile positions to avoid repeated getTileAt calls
  private tileCache = new Map<
    string,
    {
      tileX: number;
      tileY: number;
      tileZ: number;
      tile: SwimmingTile | undefined;
      isWater: boolean;
    }
  >();

  /**
   * Set the StateMutatorSystem reference (called during registration)
   */
  setStateMutatorSystem(system: StateMutatorSystem): void {
    this.stateMutatorSystem = system;
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    // Throttle: Only update once per second
    if (currentTick - this.lastUpdateTick < this.UPDATE_INTERVAL) {
      return;
    }

    this.lastUpdateTick = currentTick;

    const worldWithTiles = world as {
      getTileAt?: (x: number, y: number, z?: number) => SwimmingTile | undefined;
    };

    if (!worldWithTiles.getTileAt) return;

    // Use SimulationScheduler to filter to active entities only
    const activeEntities = world.simulationScheduler.filterActiveEntities(entities, currentTick);

    // Early return if no entities to process
    if (activeEntities.length === 0) {
      return;
    }

    // Clear stale cache entries every 100 ticks (5 seconds)
    if (currentTick % 100 === 0 && this.tileCache.size > 1000) {
      this.tileCache.clear();
    }

    // First pass: Check for entities entering/exiting water
    // This updates our underwater tracking set
    for (const entity of activeEntities) {
      const impl = entity as EntityImpl;
      const position = impl.getComponent<PositionComponent>(CT.Position);

      if (!position) continue;

      // Get tile with caching
      const tileX = Math.floor(position.x);
      const tileY = Math.floor(position.y);
      const tileZ = position.z ?? 0;
      const cacheKey = `${entity.id}`;

      let cached = this.tileCache.get(cacheKey);

      // Only query tile if entity moved to different tile
      if (
        !cached ||
        cached.tileX !== tileX ||
        cached.tileY !== tileY ||
        cached.tileZ !== tileZ
      ) {
        const tile = worldWithTiles.getTileAt(tileX, tileY, tileZ);
        const isWater = tile?.fluid?.type === 'water';

        cached = {
          tileX,
          tileY,
          tileZ,
          tile,
          isWater,
        };
        this.tileCache.set(cacheKey, cached);
      }

      // Update tracking set
      if (cached.isWater && cached.tile?.fluid) {
        this.underwaterEntities.add(entity.id);
      } else {
        this.underwaterEntities.delete(entity.id);
      }
    }

    // Early return if no underwater entities
    if (this.underwaterEntities.size === 0) {
      return;
    }

    // Second pass: Only process entities currently underwater
    // This is the huge optimization - skip all entities not in water!
    for (const entity of activeEntities) {
      // Skip if not underwater
      if (!this.underwaterEntities.has(entity.id)) {
        // Make sure to clean up if they just exited water
        const impl = entity as EntityImpl;
        const needs = impl.getComponent<NeedsComponent>(CT.Needs);
        if (needs) {
          this.handleSurfaceState(entity.id, impl, needs);
        }
        continue;
      }

      const impl = entity as EntityImpl;
      const position = impl.getComponent<PositionComponent>(CT.Position);
      const movement = impl.getComponent<MovementComponent>(CT.Movement);
      const needs = impl.getComponent<NeedsComponent>(CT.Needs);

      if (!position || !movement || !needs) continue;

      // Get cached tile (we know it's water from first pass)
      const cacheKey = `${entity.id}`;
      const cached = this.tileCache.get(cacheKey);

      if (!cached?.tile?.fluid) continue; // Shouldn't happen, but safety check

      // Agent is underwater - manage depth-based effects
      const tile = cached.tile;
      const depth = tile.elevation; // Negative value (meters)
      const oceanDepth = Math.abs(depth);

      // Initialize oxygen if needed
      if (needs.oxygen === undefined) {
        impl.updateComponent<NeedsComponent>(CT.Needs, (current) =>
          new NeedsComponent({
            ...current,
            oxygen: 1.0, // Full oxygen initially
          })
        );
        continue; // Skip this tick, oxygen will be set
      }

      // Get equipment state
      const equipment = impl.getComponent(CT.Equipment) as
        | { lightSource?: boolean; deepSeaSuit?: boolean; oxygenTank?: boolean }
        | undefined;
      const hasLightSource = equipment?.lightSource === true;
      const hasDeepSeaSuit = equipment?.deepSeaSuit === true;
      const hasOxygenTank = equipment?.oxygenTank === true;

      // Calculate depth zone effects and manage deltas
      this.manageUnderwaterEffects(
        entity.id,
        impl,
        oceanDepth,
        depth,
        hasLightSource,
        hasDeepSeaSuit,
        hasOxygenTank,
        needs
      );
    }
  }

  /**
   * Handle agent on surface/land - refill oxygen and clear underwater deltas
   */
  private handleSurfaceState(entityId: string, impl: EntityImpl, needs: NeedsComponent): void {
    // Refill oxygen instantly
    if (needs.oxygen !== undefined && needs.oxygen < 1.0) {
      impl.updateComponent<NeedsComponent>(CT.Needs, (current) =>
        new NeedsComponent({
          ...current,
          oxygen: 1.0,
        })
      );
    }

    // Clear all underwater deltas
    const cleanups = this.activeDeltaCleanups.get(entityId);
    if (cleanups) {
      cleanups.oxygen?.();
      cleanups.drowning?.();
      cleanups.pressure?.();
      this.activeDeltaCleanups.delete(entityId);
    }
  }

  /**
   * Manage underwater effects using StateMutatorSystem for gradual changes
   */
  private manageUnderwaterEffects(
    entityId: string,
    impl: EntityImpl,
    oceanDepth: number,
    depth: number,
    hasLightSource: boolean,
    hasDeepSeaSuit: boolean,
    hasOxygenTank: boolean,
    needs: NeedsComponent
  ): void {
    // Determine depth zone
    let depthZone: string;
    let speedMultiplier = 1.0;
    let oxygenDrainRate = 0.0; // Per minute (converted from per-second values)
    let pressureDamageRate = 0.0; // Per minute

    const lightLevel = calculateLightLevel(depth);
    const pressure = calculatePressure(depth);

    if (oceanDepth <= 200) {
      // EPIPELAGIC
      depthZone = 'epipelagic';
      speedMultiplier = 0.5;
      oxygenDrainRate = 0.005 * 60; // 0.3 per minute
    } else if (oceanDepth <= 1000) {
      // MESOPELAGIC
      depthZone = 'mesopelagic';
      speedMultiplier = 0.3;
      oxygenDrainRate = 0.01 * 60; // 0.6 per minute

      // Vision penalty without light source
      if (!hasLightSource && lightLevel < 10) {
        speedMultiplier *= 0.5;
      }
    } else if (oceanDepth <= 4000) {
      // BATHYPELAGIC
      depthZone = 'bathypelagic';
      speedMultiplier = 0.1;
      oxygenDrainRate = 0.02 * 60; // 1.2 per minute

      // Pressure damage begins
      if (!hasDeepSeaSuit && pressure > 100) {
        pressureDamageRate = 0.001 * (pressure / 100) * 60;
      }
    } else if (oceanDepth <= 6000) {
      // ABYSSAL
      depthZone = 'abyssal';
      speedMultiplier = 0.05;
      oxygenDrainRate = 0.05 * 60; // 3.0 per minute

      if (!hasDeepSeaSuit) {
        pressureDamageRate = 0.01 * 60; // 0.6 per minute
      }
    } else {
      // HADAL
      depthZone = 'hadal';
      speedMultiplier = 0.02;
      oxygenDrainRate = 0.1 * 60; // 6.0 per minute

      if (!hasDeepSeaSuit) {
        pressureDamageRate = 0.05 * 60; // 3.0 per minute
      }
    }

    // Apply oxygen tank bonus
    if (hasOxygenTank) {
      oxygenDrainRate *= 0.2; // 5× breath capacity
    }

    // Get or create cleanup tracking
    let cleanups = this.activeDeltaCleanups.get(entityId);
    if (!cleanups) {
      cleanups = {};
      this.activeDeltaCleanups.set(entityId, cleanups);
    }

    // Only update movement speed multiplier if depth zone changed
    if (cleanups.lastDepthZone !== depthZone) {
      impl.updateComponent<MovementComponent>(CT.Movement, (current) => ({
        ...current,
        speedMultiplier: speedMultiplier,
      }));
      cleanups.lastDepthZone = depthZone;
    }

    // Register/update oxygen drain delta
    if (this.stateMutatorSystem && oxygenDrainRate > 0) {
      // Clear old delta if it exists
      cleanups.oxygen?.();

      // Register new delta
      cleanups.oxygen = this.stateMutatorSystem.registerDelta({
        entityId,
        componentType: CT.Needs,
        field: 'oxygen',
        deltaPerMinute: -oxygenDrainRate,
        min: 0,
        source: `swimming:oxygen:${depthZone}`,
      });
    }

    // Register drowning damage if oxygen depleted
    if (this.stateMutatorSystem && needs.oxygen !== undefined && needs.oxygen <= 0) {
      if (!cleanups.drowning) {
        // 1% health per second = 0.6 health per minute
        cleanups.drowning = this.stateMutatorSystem.registerDelta({
          entityId,
          componentType: CT.Needs,
          field: 'health',
          deltaPerMinute: -0.6,
          min: 0,
          source: 'swimming:drowning',
        });
      }
    } else {
      // Clear drowning damage if oxygen recovered
      cleanups.drowning?.();
      cleanups.drowning = undefined;
    }

    // Register/update pressure damage delta
    if (this.stateMutatorSystem && pressureDamageRate > 0) {
      // Clear old delta if it exists
      cleanups.pressure?.();

      // Register new delta (convert to health scale 0-1)
      const healthLossPerMinute = pressureDamageRate / 100;
      cleanups.pressure = this.stateMutatorSystem.registerDelta({
        entityId,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: -healthLossPerMinute,
        min: 0,
        source: `swimming:pressure:${depthZone}`,
      });
    } else if (cleanups.pressure) {
      // Clear pressure damage if no longer at dangerous depth
      cleanups.pressure();
      cleanups.pressure = undefined;
    }
  }
}

// Minimal tile interface
interface SwimmingTile {
  terrain: string;
  elevation: number;
  oceanZone?: 'epipelagic' | 'mesopelagic' | 'bathypelagic' | 'abyssal' | 'hadal';
  fluid?: {
    type: 'water' | 'magma' | 'blood' | 'oil' | 'acid';
    depth: number;
    pressure: number;
    temperature: number;
  };
}
