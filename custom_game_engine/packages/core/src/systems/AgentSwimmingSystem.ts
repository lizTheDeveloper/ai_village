import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { Entity } from '../ecs/Entity.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { NeedsComponent } from '../components/NeedsComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { calculatePressure, calculateLightLevel } from '@ai-village/world';
import { setMutationRate, clearMutationRate } from '../components/MutationVectorComponent.js';

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
 * - Throttled to update every 40 ticks (2 seconds) instead of every tick
 * - Spatial proximity check - skips system entirely if no water nearby
 * - Tracks underwaterEntities Set - only processes entities actually in water!
 * - Uses SimulationScheduler to only process active entities
 * - Position tracking - skips agents that haven't moved to a new tile
 * - Single-pass processing - combines water detection + underwater processing in one loop
 * - Caches tile lookups - only rechecks when entity moves to different tile
 * - Uses MutationVectorComponent for gradual oxygen drain and pressure damage
 *   (Applied smoothly every tick via StateMutatorSystem)
 * - Only sets movement speed multiplier when depth zone changes
 *
 * Performance: Typically processes ~0-5 underwater entities instead of 4000+ total entities
 * With landlocked villages: System exits immediately (zero cost)
 *
 * Future enhancements:
 * - Decompression sickness (rapid ascent)
 * - Bioluminescent creatures (provide light)
 * - Pressure-adapted aquatic species (no penalties)
 */
export class AgentSwimmingSystem extends BaseSystem {
  public readonly id: SystemId = 'agent_swimming';
  public readonly priority: number = 18; // After fluid dynamics (16), planetary currents (17)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Agent,    // Only process agents, not animals or other entities
    CT.Position,
    CT.Movement,
    CT.Needs,
  ];
  // Only run when agent components exist (O(1) activation check)
  public readonly activationComponents = [CT.Agent] as const;

  // Throttling: Update every 40 ticks (2 seconds at 20 TPS)
  protected readonly throttleInterval = 40;

  // Track entities currently in water - only process these!
  private underwaterEntities = new Set<string>();

  // Track last depth zone for each entity to detect zone changes
  private lastDepthZone = new Map<string, string>();

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

  // Track last checked position to skip non-moving agents
  private lastCheckedPosition = new Map<
    string,
    { x: number; y: number; z: number }
  >();


  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    const worldWithTiles = ctx.world as {
      getTileAt?: (x: number, y: number, z?: number) => SwimmingTile | undefined;
      getChunkManager?: () => {
        getChunk: (x: number, y: number) => { generated?: boolean } | undefined;
      } | undefined;
    };

    if (!worldWithTiles.getTileAt) return;

    // Get chunk manager for generation checks
    const chunkManager = typeof worldWithTiles.getChunkManager === 'function'
      ? worldWithTiles.getChunkManager()
      : undefined;

    // Early return if no entities to process (already filtered by SimulationScheduler via ctx.activeEntities)
    if (ctx.activeEntities.length === 0) {
      return;
    }

    // OPTIMIZATION: If no one is swimming and no one near water, skip entirely
    if (this.underwaterEntities.size === 0 && !this.hasNearbyWater(ctx.activeEntities, worldWithTiles, chunkManager)) {
      return;
    }

    // Clear stale cache entries every 100 ticks (5 seconds)
    if (currentTick % 100 === 0 && this.tileCache.size > 1000) {
      this.tileCache.clear();
      this.lastCheckedPosition.clear();
    }

    // SINGLE-PASS OPTIMIZATION: Process all agents in one loop
    // Combines water detection + underwater processing
    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      const position = impl.getComponent<PositionComponent>(CT.Position);
      const movement = impl.getComponent<MovementComponent>(CT.Movement);
      const needs = impl.getComponent<NeedsComponent>(CT.Needs);

      if (!position || !movement || !needs) continue;

      // OPTIMIZATION: Skip if agent hasn't moved since last check
      const lastPos = this.lastCheckedPosition.get(entity.id);
      const tileX = Math.floor(position.x);
      const tileY = Math.floor(position.y);
      const tileZ = position.z ?? 0;

      if (
        lastPos &&
        lastPos.x === tileX &&
        lastPos.y === tileY &&
        lastPos.z === tileZ
      ) {
        // Agent hasn't moved to a new tile - use cached underwater state
        if (this.underwaterEntities.has(entity.id)) {
          // Still underwater, process depth effects
          const cached = this.tileCache.get(entity.id);
          if (cached?.tile?.fluid) {
            this.processUnderwaterAgent(
              entity.id,
              impl,
              cached.tile,
              movement,
              needs
            );
          }
        }
        continue;
      }

      // Agent moved - update position tracking
      this.lastCheckedPosition.set(entity.id, { x: tileX, y: tileY, z: tileZ });

      // Get tile with caching
      let cached = this.tileCache.get(entity.id);

      // Only query tile if entity moved to different tile
      if (
        !cached ||
        cached.tileX !== tileX ||
        cached.tileY !== tileY ||
        cached.tileZ !== tileZ
      ) {
        // CRITICAL: Skip ungenerated chunks to avoid expensive terrain generation
        if (!this.isChunkGenerated(tileX, tileY, chunkManager)) {
          // Cache as non-water for ungenerated chunks
          cached = {
            tileX,
            tileY,
            tileZ,
            tile: undefined,
            isWater: false,
          };
          this.tileCache.set(entity.id, cached);
        } else {
          const tile = worldWithTiles.getTileAt(tileX, tileY, tileZ);
          const isWater = tile?.fluid?.type === 'water';

          cached = {
            tileX,
            tileY,
            tileZ,
            tile,
            isWater,
          };
          this.tileCache.set(entity.id, cached);
        }
      }

      // Process based on water state
      if (cached.isWater && cached.tile?.fluid) {
        // Agent entered or still in water
        this.underwaterEntities.add(entity.id);
        this.processUnderwaterAgent(entity.id, impl, cached.tile, movement, needs);
      } else {
        // Agent on land/surface
        this.underwaterEntities.delete(entity.id);
        this.handleSurfaceState(entity.id, impl, needs);
      }
    }
  }

  /**
   * Process an agent that is currently underwater
   */
  private processUnderwaterAgent(
    entityId: string,
    impl: EntityImpl,
    tile: SwimmingTile,
    movement: MovementComponent,
    needs: NeedsComponent
  ): void {
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
      return; // Skip this tick, oxygen will be set
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
      entityId,
      impl,
      oceanDepth,
      depth,
      hasLightSource,
      hasDeepSeaSuit,
      hasOxygenTank,
      needs
    );
  }

  /**
   * Check if a chunk is generated before calling getTileAt
   * CRITICAL: Prevents expensive terrain generation (20-50ms per chunk!)
   */
  private isChunkGenerated(
    tileX: number,
    tileY: number,
    chunkManager: { getChunk: (x: number, y: number) => { generated?: boolean } | undefined } | undefined
  ): boolean {
    if (!chunkManager) return true; // No chunk manager, assume generated

    const CHUNK_SIZE = 32;
    const chunkX = Math.floor(tileX / CHUNK_SIZE);
    const chunkY = Math.floor(tileY / CHUNK_SIZE);
    const chunk = chunkManager.getChunk(chunkX, chunkY);

    return chunk?.generated === true;
  }

  /**
   * Quick check if any active agents are near water tiles
   * Returns false if all agents are landlocked, allowing early exit
   */
  private hasNearbyWater(
    activeEntities: ReadonlyArray<Entity>,
    worldWithTiles: { getTileAt?: (x: number, y: number, z?: number) => SwimmingTile | undefined },
    chunkManager: { getChunk: (x: number, y: number) => { generated?: boolean } | undefined } | undefined
  ): boolean {
    if (!worldWithTiles.getTileAt) return false;

    // Sample up to 10 agents to check for nearby water
    // If all 10 are landlocked, assume no water nearby
    const sampleSize = Math.min(10, activeEntities.length);

    for (let i = 0; i < sampleSize; i++) {
      const entity = activeEntities[i];
      const impl = entity as EntityImpl;
      const position = impl.getComponent<PositionComponent>(CT.Position);

      if (!position) continue;

      const tileX = Math.floor(position.x);
      const tileY = Math.floor(position.y);
      const tileZ = position.z ?? 0;

      // CRITICAL: Skip ungenerated chunks to avoid expensive terrain generation
      if (!this.isChunkGenerated(tileX, tileY, chunkManager)) {
        continue;
      }

      const tile = worldWithTiles.getTileAt(tileX, tileY, tileZ);
      if (tile?.fluid?.type === 'water') {
        return true; // Found water, continue processing
      }
    }

    return false; // No water found in sample
  }

  /**
   * Handle agent on surface/land - refill oxygen and clear underwater mutations
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

    // Clear all underwater mutations
    clearMutationRate(impl, 'needs.oxygen');
    clearMutationRate(impl, 'needs.health');

    // Clear depth zone tracking
    this.lastDepthZone.delete(entityId);
  }

  /**
   * Manage underwater effects using MutationVectorComponent for gradual changes
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
    let oxygenDrainRate = 0.0; // Per second
    let pressureDamageRate = 0.0; // Per second

    const lightLevel = calculateLightLevel(depth);
    const pressure = calculatePressure(depth);

    if (oceanDepth <= 200) {
      // EPIPELAGIC
      depthZone = 'epipelagic';
      speedMultiplier = 0.5;
      oxygenDrainRate = 0.005; // Per second
    } else if (oceanDepth <= 1000) {
      // MESOPELAGIC
      depthZone = 'mesopelagic';
      speedMultiplier = 0.3;
      oxygenDrainRate = 0.01; // Per second

      // Vision penalty without light source
      if (!hasLightSource && lightLevel < 10) {
        speedMultiplier *= 0.5;
      }
    } else if (oceanDepth <= 4000) {
      // BATHYPELAGIC
      depthZone = 'bathypelagic';
      speedMultiplier = 0.1;
      oxygenDrainRate = 0.02; // Per second

      // Pressure damage begins
      if (!hasDeepSeaSuit && pressure > 100) {
        pressureDamageRate = 0.001 * (pressure / 100);
      }
    } else if (oceanDepth <= 6000) {
      // ABYSSAL
      depthZone = 'abyssal';
      speedMultiplier = 0.05;
      oxygenDrainRate = 0.05; // Per second

      if (!hasDeepSeaSuit) {
        pressureDamageRate = 0.01; // Per second
      }
    } else {
      // HADAL
      depthZone = 'hadal';
      speedMultiplier = 0.02;
      oxygenDrainRate = 0.1; // Per second

      if (!hasDeepSeaSuit) {
        pressureDamageRate = 0.05; // Per second
      }
    }

    // Apply oxygen tank bonus
    if (hasOxygenTank) {
      oxygenDrainRate *= 0.2; // 5× breath capacity
    }

    // Only update movement speed multiplier if depth zone changed
    const lastZone = this.lastDepthZone.get(entityId);
    if (lastZone !== depthZone) {
      impl.updateComponent<MovementComponent>(CT.Movement, (current) => ({
        ...current,
        speedMultiplier: speedMultiplier,
      }));
      this.lastDepthZone.set(entityId, depthZone);
    }

    // Set oxygen drain mutation
    if (oxygenDrainRate > 0) {
      setMutationRate(impl, 'needs.oxygen', -oxygenDrainRate, {
        min: 0,
        source: `swimming_oxygen_${depthZone}`,
      });
    }

    // Calculate total health damage (drowning + pressure)
    let totalHealthDamage = 0;
    let damageSource = '';

    // Drowning damage if oxygen depleted
    if (needs.oxygen !== undefined && needs.oxygen <= 0) {
      // 1% health per second = 0.01 health per second (0-1 scale)
      totalHealthDamage += 0.01;
      damageSource = 'swimming_drowning';
    }

    // Pressure damage
    if (pressureDamageRate > 0) {
      // Convert to health scale 0-1 (health is 0-1 normalized)
      const healthLossPerSecond = pressureDamageRate / 100;
      totalHealthDamage += healthLossPerSecond;
      damageSource = damageSource
        ? `${damageSource}+pressure_${depthZone}`
        : `swimming_pressure_${depthZone}`;
    }

    // Apply combined health damage or clear if none
    if (totalHealthDamage > 0) {
      setMutationRate(impl, 'needs.health', -totalHealthDamage, {
        min: 0,
        source: damageSource,
      });
    } else {
      clearMutationRate(impl, 'needs.health');
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
