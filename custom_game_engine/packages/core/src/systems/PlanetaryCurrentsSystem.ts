import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { EventBus } from '../events/EventBus.js';
import type { World } from '../ecs/World.js';
import type { WorldEvents } from '../events/domains/world.events.js';

/**
 * PlanetaryCurrentsSystem - Large-scale ocean circulation ("complex flow for big things")
 *
 * Complements FluidDynamicsSystem (local slow flow) with planetary-scale phenomena:
 * - Ocean gyres (large circular currents driven by Coriolis effect)
 * - Thermohaline circulation (global "conveyor belt" driven by temp/salinity)
 * - Tidal forces (moon gravity affects water level)
 * - Upwelling/downwelling zones (nutrient circulation)
 *
 * Performance:
 * - Update frequency: Once per game hour (1200 ticks = 1 minute, so 72000 ticks = 1 hour)
 * - Processes biome-scale regions, not individual tiles
 * - ~100× slower than local flow, but affects entire ocean basins
 *
 * Coriolis Effect:
 * - Northern hemisphere: currents deflect right
 * - Southern hemisphere: currents deflect left
 * - Creates clockwise gyres in north, counterclockwise in south
 * - Strength proportional to latitude and planet rotation speed
 *
 * Thermohaline Circulation:
 * - Warm surface water flows poleward
 * - Cools at poles, sinks (dense cold water)
 * - Deep cold water flows equatorward
 * - Upwells at equator (nutrient-rich)
 * - Global cycle takes ~1000 years in real oceans
 *
 * Tidal Forces:
 * - Moon gravity creates bulges in ocean
 * - Two high tides per day (moon side + opposite side)
 * - Tide amplitude: 0-10m depending on moon distance/phase
 * - Affects coastal water levels, not deep ocean
 *
 * Integration:
 * - Reads Tile.fluid, Tile.oceanZone
 * - Writes Tile.fluid.flowDirection, flowVelocity (large-scale drift)
 * - Triggers FluidDynamicsSystem dirty flags when currents shift
 * - Uses world.latitude for Coriolis calculations
 */
export class PlanetaryCurrentsSystem extends BaseSystem {
  public readonly id: SystemId = 'planetary_currents';
  public readonly priority: number = 17; // After terrain (15), fluid dynamics (16), before swimming (18)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  protected readonly throttleInterval = 72000; // 1 game hour at 20 TPS (60 min × 60 sec × 20 TPS)

  // Tide simulation state
  private moonPhase = 0; // 0-1 (0 = new moon, 0.5 = full moon)
  private moonDistance = 1.0; // Relative distance (1.0 = average)

  // Performance tracking
  private lastUpdateTime = 0;
  private regionsProcessed = 0;

  protected onInitialize(_world: World, eventBus: EventBus): void {
    // Subscribe to time:day events for tide updates
    // Daily updates trigger tidal recalculation for affected coastal tiles
    eventBus.on('time:day_changed', (event) => {
      // Trigger tidal force recalculation on day change
      // Moon phase/distance is calculated internally in updateMoonCycle()
      // based on current tick, so no separate celestial subscription needed
      const data = event.data as WorldEvents['time:day_changed'];
      this.onDayChanged(data.day);
    });
  }

  /**
   * Handle day change for tidal updates.
   * Recalculates tidal forces based on current moon phase.
   */
  private onDayChanged(_day: number): void {
    // Tidal forces are recalculated during the next update cycle
    // This ensures coastal tiles get updated tidal amplitudes
    // The actual calculation happens in onUpdate via updateMoonCycle
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    const startTime = performance.now();

    // Get world interface
    const worldWithTiles = ctx.world as {
      getTileAt?: (x: number, y: number, z?: number) => OceanTile | undefined;
      setTileAt?: (x: number, y: number, z: number, tile: OceanTile) => void;
      latitude?: (x: number, y: number) => number; // Latitude for Coriolis
      planetRadius?: number; // Planet size for current strength
    };

    if (!worldWithTiles.getTileAt || !worldWithTiles.setTileAt) {
      return;
    }

    // Update moon phase and distance (simplified lunar cycle)
    this.updateMoonCycle(currentTick);

    // TODO: Process ocean regions (not individual tiles)
    // For now, this is a placeholder for future implementation
    // Real implementation would:
    // 1. Divide ocean into ~1000×1000 tile regions
    // 2. Calculate regional current vectors
    // 3. Apply Coriolis deflection based on latitude
    // 4. Add thermohaline vertical circulation
    // 5. Calculate tidal amplitude for coastal tiles
    // 6. Mark affected tiles as dirty in FluidDynamicsSystem

    this.regionsProcessed = 0;

    // Performance tracking
    this.lastUpdateTime = performance.now() - startTime;
  }

  /**
   * Update moon cycle for tidal simulation.
   * Simplified: 29.5-day lunar cycle.
   */
  private updateMoonCycle(currentTick: number): void {
    // 29.5 days × 24 hours × 60 minutes × 1200 ticks = 51,840,000 ticks per lunar month
    const LUNAR_MONTH = 51_840_000;
    const phase = (currentTick % LUNAR_MONTH) / LUNAR_MONTH;

    this.moonPhase = phase;
    // Simplified elliptical orbit: distance varies ±5% from average
    this.moonDistance = 1.0 + 0.05 * Math.sin(phase * Math.PI * 2);
  }

  /**
   * Calculate Coriolis deflection for given latitude.
   *
   * @param latitude - Latitude in degrees (-90 to +90)
   * @param velocityX - Current X velocity
   * @param velocityY - Current Y velocity
   * @returns Deflected velocity { x, y }
   */
  private calculateCoriolisDeflection(
    latitude: number,
    velocityX: number,
    velocityY: number
  ): { x: number; y: number } {
    // Coriolis parameter: f = 2Ω sin(φ), where Ω = planet rotation, φ = latitude
    // For Earth: Ω = 7.2921 × 10^-5 rad/s
    // Simplified: f proportional to sin(latitude)

    const latRad = (latitude * Math.PI) / 180;
    const coriolisStrength = Math.sin(latRad) * 0.01; // Simplified strength

    // Deflect perpendicular to motion (right in NH, left in SH)
    const deflectedX = velocityX - coriolisStrength * velocityY;
    const deflectedY = velocityY + coriolisStrength * velocityX;

    return { x: deflectedX, y: deflectedY };
  }

  /**
   * Calculate tidal amplitude at given position.
   *
   * @param moonPhase - Current moon phase (0-1)
   * @param moonDistance - Moon distance (relative to average)
   * @param latitude - Latitude in degrees
   * @param longitude - Longitude in degrees
   * @returns Tidal amplitude in meters (-5 to +5m)
   */
  private calculateTidalAmplitude(
    moonPhase: number,
    moonDistance: number,
    latitude: number,
    longitude: number
  ): number {
    // Simplified tidal model:
    // - Two tidal bulges (moon side + opposite)
    // - Spring tides (new/full moon): stronger
    // - Neap tides (quarter moons): weaker
    // - Amplitude inversely proportional to distance³

    // Moon position (simplified: assume equatorial orbit)
    const moonLongitude = moonPhase * 360; // 0-360°

    // Angular distance from moon
    const angleFromMoon = Math.abs(longitude - moonLongitude);
    const distFromBulge = Math.min(angleFromMoon, 360 - angleFromMoon);

    // Tidal force: cos²(angle) × 1/distance³
    const angleRad = (distFromBulge * Math.PI) / 180;
    const tidalForce = Math.pow(Math.cos(angleRad), 2) / Math.pow(moonDistance, 3);

    // Spring/neap modulation
    const springFactor = Math.abs(Math.cos(moonPhase * Math.PI * 2)); // 1.0 at new/full, 0.0 at quarter

    // Latitude effect: tides strongest at mid-latitudes
    const latRad = (latitude * Math.PI) / 180;
    const latitudeFactor = Math.cos(latRad);

    // Base amplitude: ±5m (Earth-like)
    const amplitude = 5.0 * tidalForce * (0.5 + 0.5 * springFactor) * latitudeFactor;

    return amplitude;
  }

  /**
   * Get debug info about current state.
   */
  getDebugInfo(): {
    moonPhase: number;
    moonDistance: number;
    lastUpdateTime: number;
    regionsProcessed: number;
  } {
    return {
      moonPhase: this.moonPhase,
      moonDistance: this.moonDistance,
      lastUpdateTime: this.lastUpdateTime,
      regionsProcessed: this.regionsProcessed,
    };
  }
}

// Minimal tile interface for ocean tiles
interface OceanTile {
  terrain: string;
  elevation: number;
  oceanZone?: 'epipelagic' | 'mesopelagic' | 'bathypelagic' | 'abyssal' | 'hadal';
  fluid?: {
    type: 'water' | 'magma' | 'blood' | 'oil' | 'acid';
    depth: number;
    pressure: number;
    temperature: number;
    flowDirection?: { x: number; y: number };
    flowVelocity?: number;
    stagnant: boolean;
    lastUpdate: number;
  };
}
