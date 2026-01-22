import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World, ITile } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { TemperatureComponent } from '../components/TemperatureComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { WeatherComponent } from '../components/WeatherComponent.js';
import { setMutationRate, clearMutationRate } from '../components/MutationVectorComponent.js';
import {
  HEALTH_DAMAGE_RATE,
  WORLD_TEMP_BASE,
  TEMP_DAILY_VARIATION,
  THERMAL_CHANGE_RATE,
  HEALTH_CRITICAL,
} from '../constants/index.js';

/** Wall material insulation values (matching WALL_MATERIAL_PROPERTIES in Tile.ts) */
const WALL_INSULATION: Record<string, number> = {
  wood: 50,
  stone: 80,
  mud_brick: 60,
  ice: 30,
  metal: 20,
  glass: 10,
  thatch: 40,
};

/** Extended world interface with tile access */
interface WorldWithTiles extends World {
  getTileAt(x: number, y: number): ITile | undefined;
}

/**
 * TemperatureSystem - Simulates temperature effects on entities
 *
 * Dependencies:
 * @see TimeSystem (priority 3) - Provides time of day for daily temperature variation
 * @see WeatherSystem (priority 5) - Provides weather modifiers (rain, frost) affecting temperature
 */
export class TemperatureSystem extends BaseSystem {
  public readonly id: SystemId = 'temperature';
  public readonly priority: number = 14; // Run after weather (5), before needs (15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Temperature,
    CT.Position,
  ];
  // Only run when temperature components exist (O(1) activation check)
  public readonly activationComponents = [CT.Temperature] as const;

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides time of day for daily temperature cycles
   * @see WeatherSystem - provides weather modifiers (tempModifier) affecting ambient temperature
   * @see StateMutatorSystem - handles batched health damage from temperature
   */
  public readonly dependsOn = ['time', 'weather', 'state_mutator'] as const;
  protected readonly throttleInterval = 10; // FAST - 0.5 seconds for responsive temperature changes

  private readonly HEALTH_DAMAGE_RATE = HEALTH_DAMAGE_RATE; // Health damage per second in dangerous temps
  private readonly BASE_TEMP = WORLD_TEMP_BASE; // Default world temperature in °C
  private readonly DAILY_VARIATION = TEMP_DAILY_VARIATION; // ±8°C daily temperature swing
  private readonly THERMAL_RATE = THERMAL_CHANGE_RATE; // Rate of temperature change per second (0.15 = ~7 seconds to change 1°C)
  private currentWorldTemp: number = this.BASE_TEMP;
  private previousDangerousStates = new Map<string, boolean>();

  // Performance: Cache singleton and building entity IDs to avoid repeated queries
  private timeEntityId: string | null = null;
  private weatherEntityId: string | null = null;
  private buildingCache: Array<{ position: PositionComponent; component: BuildingComponent; entityId: string }> = [];
  private buildingCacheLastUpdate: number = 0;
  private readonly BUILDING_CACHE_DURATION = 100; // Refresh every 100 ticks

  // Performance: Cache tile-based insulation results (key = "x,y", value = insulation data)
  private tileInsulationCache = new Map<string, { insulation: number; baseTemp: number } | null>();
  private tileInsulationCacheLastUpdate: number = 0;
  private readonly TILE_CACHE_DURATION = 50; // Refresh every 50 ticks (walls don't change often)

  // StateMutatorSystem integration for batched health damage
  private stateMutator: StateMutatorSystem | null = null;
  private lastDeltaUpdateTick = 0;
  private readonly DELTA_UPDATE_INTERVAL = 1200; // 1 game minute at 20 TPS
  private deltaCleanups = new Map<string, () => void>();

  /**
   * Set the StateMutatorSystem reference (called during system registration)
   */
  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const deltaTime = ctx.deltaTime;

    // Calculate world ambient temperature (uses cached time entity)
    this.currentWorldTemp = this.calculateWorldTemperature(world);

    // Get weather modifier once (uses cached weather entity)
    const weatherModifier = this.getWeatherModifier(world);

    // Update building cache if needed (only every N ticks, not every frame!)
    if (world.tick - this.buildingCacheLastUpdate > this.BUILDING_CACHE_DURATION) {
      this.refreshBuildingCache(world);
      this.buildingCacheLastUpdate = world.tick;
    }

    // Clear tile insulation cache periodically (walls can be built/destroyed)
    if (world.tick - this.tileInsulationCacheLastUpdate > this.TILE_CACHE_DURATION) {
      this.tileInsulationCache.clear();
      this.tileInsulationCacheLastUpdate = world.tick;
    }

    // Check if we should update deltas (once per game minute)
    const currentTick = world.tick;
    const shouldUpdateDeltas = currentTick - this.lastDeltaUpdateTick >= this.DELTA_UPDATE_INTERVAL;

    // Process each active entity (SimulationScheduler already filtered)
    for (const entity of ctx.activeEntities) {
      const comps = ctx.components(entity);
      const posComp = comps.optional<PositionComponent>(CT.Position);

      if (!posComp) continue;

      // Calculate agent's effective temperature
      let effectiveTemp = this.currentWorldTemp;

      // Apply weather modifier (already fetched once)
      effectiveTemp += weatherModifier;

      // Apply building effects (insulation + base temp) - uses cache
      const buildingEffect = this.calculateBuildingEffect(world, posComp);
      if (buildingEffect !== null) {
        // Formula: effectiveTemp = ambientTemp * (1 - insulation) + baseTemp
        effectiveTemp = effectiveTemp * (1 - buildingEffect.insulation) + buildingEffect.baseTemp;
      }

      // Apply heat source effects - uses cache
      const heatBonus = this.calculateHeatSourceBonus(posComp);
      effectiveTemp += heatBonus;

      // Get current temperature component to apply thermal inertia
      const currentTempComp = comps.optional<TemperatureComponent>(CT.Temperature);
      if (!currentTempComp) continue;

      // Gradually adjust body temperature toward environmental temperature (thermal inertia)
      // Body temperature changes slowly, not instantly
      const tempDiff = effectiveTemp - currentTempComp.currentTemp;
      const tempChange = tempDiff * this.THERMAL_RATE * deltaTime;
      const newTemp = currentTempComp.currentTemp + tempChange;

      // Update agent temperature with gradual change
      comps.update<TemperatureComponent>(CT.Temperature, (current) => ({
        ...current,
        currentTemp: newTemp,
        state: this.calculateTemperatureState(newTemp, current),
      }));

      // Get updated component after state calculation
      const updatedTemp = comps.optional<TemperatureComponent>(CT.Temperature)!;

      // Check for state transitions and emit events
      this.checkTemperatureEvents(world, entity, updatedTemp);

      // Update health damage deltas once per game minute
      if (shouldUpdateDeltas) {
        this.updateTemperatureDeltas(entity.id, updatedTemp.state);
      }
    }

    // Mark delta rates as updated
    if (shouldUpdateDeltas) {
      this.lastDeltaUpdateTick = currentTick;
    }
  }

  /**
   * Calculate world ambient temperature based on time and season
   */
  private calculateWorldTemperature(world: World): number {
    // Use cached time entity ID (performance optimization)
    let timeOfDay = 12; // Default noon if no time entity

    if (!this.timeEntityId) {
      // Find and cache time entity
      const timeEntities = world.query().with(CT.Time).executeEntities();
      if (timeEntities.length > 0) {
        this.timeEntityId = timeEntities[0]!.id;
      }
    }

    if (this.timeEntityId) {
      const timeEntity = world.getEntity(this.timeEntityId);
      if (timeEntity) {
        const timeComp = (timeEntity as EntityImpl).getComponent<any>('time');
        if (timeComp) {
          timeOfDay = timeComp.timeOfDay;
        }
      } else {
        this.timeEntityId = null; // Entity was deleted, reset cache
      }
    }

    // Convert time of day (0-24) to radians for sine wave
    // 0 hours = midnight (low), 12 hours = noon (peak)
    const timeRadians = ((timeOfDay - 6) / 24) * Math.PI * 2; // Shift by 6 hours so peak is at noon

    // Daily variation using sine wave (peak at noon, low at midnight)
    const dailyVariation = this.DAILY_VARIATION * Math.sin(timeRadians);

    return this.BASE_TEMP + dailyVariation;
  }

  /**
   * Get temperature modifier from current weather
   */
  private getWeatherModifier(world: World): number {
    // Use cached weather entity ID (performance optimization)
    if (!this.weatherEntityId) {
      // Find and cache weather entity
      const weatherEntities = world.query().with(CT.Weather).executeEntities();
      if (weatherEntities.length > 0) {
        this.weatherEntityId = weatherEntities[0]!.id;
      }
    }

    if (this.weatherEntityId) {
      const weatherEntity = world.getEntity(this.weatherEntityId);
      if (weatherEntity) {
        const weather = (weatherEntity as EntityImpl).getComponent<WeatherComponent>(CT.Weather);
        if (weather) {
          return weather.tempModifier;
        }
      } else {
        this.weatherEntityId = null; // Entity was deleted, reset cache
      }
    }

    return 0;
  }

  /**
   * Refresh building cache (called once every N ticks, not every frame!)
   */
  private refreshBuildingCache(world: World): void {
    this.buildingCache = [];

    const buildingEntities = world.query().with(CT.Building).with(CT.Position).executeEntities();

    for (const entity of buildingEntities) {
      const impl = entity as EntityImpl;
      const buildingComp = impl.getComponent<BuildingComponent>(CT.Building);
      const posComp = impl.getComponent<PositionComponent>(CT.Position);

      if (buildingComp && posComp) {
        this.buildingCache.push({
          position: posComp,
          component: buildingComp,
          entityId: entity.id,
        });
      }
    }
  }

  /**
   * Calculate building insulation and base temperature effect.
   * Checks both legacy entity-based buildings AND tile-based walls.
   */
  private calculateBuildingEffect(
    world: World,
    position: PositionComponent
  ): { insulation: number; baseTemp: number } | null {
    // Use cached buildings (refreshed every N ticks, not every frame!)
    const buildings = this.buildingCache;

    for (const building of buildings) {
      const buildingPos = building.position;
      const buildingComp = building.component;

      // Check if agent is inside building interior
      if (buildingComp.interior && buildingComp.interiorRadius > 0) {
        const dx = position.x - buildingPos.x;
        const dy = position.y - buildingPos.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared <= buildingComp.interiorRadius * buildingComp.interiorRadius) {
          // Agent is inside - apply insulation and base temperature
          // Only apply if building is complete
          if (buildingComp.isComplete) {
            return {
              insulation: buildingComp.insulation,
              baseTemp: buildingComp.baseTemperature,
            };
          }
        }
      }
    }

    // Check tile-based walls if world supports tile access
    const worldWithTiles = world as WorldWithTiles;
    if (typeof worldWithTiles.getTileAt === 'function') {
      const tileEffect = this.calculateTileBasedInsulation(worldWithTiles, position);
      if (tileEffect) {
        return tileEffect;
      }
    }

    return null;
  }

  /**
   * Calculate insulation from tile-based walls.
   * Uses simple enclosure detection: if surrounded by walls on 3+ sides,
   * agent is considered "indoors" and gets insulation benefit.
   * PERFORMANCE: Uses cache to avoid repeated tile lookups (12 per entity per tick!)
   * PERFORMANCE: Skips ungenerated chunks to avoid expensive terrain generation
   */
  private calculateTileBasedInsulation(
    world: WorldWithTiles,
    position: PositionComponent
  ): { insulation: number; baseTemp: number } | null {
    const tileX = Math.floor(position.x);
    const tileY = Math.floor(position.y);
    const cacheKey = `${tileX},${tileY}`;

    // Check cache first (HUGE performance win - avoids 12 getTileAt calls per entity!)
    if (this.tileInsulationCache.has(cacheKey)) {
      return this.tileInsulationCache.get(cacheKey)!;
    }

    // Performance: Skip if chunk not generated to avoid expensive terrain generation
    const worldWithChunks = world as unknown as {
      getChunkManager?: () => {
        getChunk: (x: number, y: number) => { generated?: boolean } | undefined;
      } | undefined;
    };
    const chunkManager = typeof worldWithChunks.getChunkManager === 'function'
      ? worldWithChunks.getChunkManager()
      : undefined;
    if (chunkManager) {
      const CHUNK_SIZE = 32;
      const chunkX = Math.floor(tileX / CHUNK_SIZE);
      const chunkY = Math.floor(tileY / CHUNK_SIZE);
      const chunk = chunkManager.getChunk(chunkX, chunkY);
      if (!chunk?.generated) {
        // Cache null result for ungenerated chunks
        this.tileInsulationCache.set(cacheKey, null);
        return null;
      }
    }

    // Cache miss - calculate insulation and store result
    // Check for walls in all 4 cardinal directions (within 3 tiles)
    const directions = [
      { dx: 0, dy: -1, name: 'north' },
      { dx: 0, dy: 1, name: 'south' },
      { dx: -1, dy: 0, name: 'west' },
      { dx: 1, dy: 0, name: 'east' },
    ];

    let wallCount = 0;
    let totalInsulation = 0;
    const maxDistance = 3; // Check up to 3 tiles in each direction

    for (const dir of directions) {
      // Look for a wall in this direction
      for (let dist = 1; dist <= maxDistance; dist++) {
        const checkX = tileX + dir.dx * dist;
        const checkY = tileY + dir.dy * dist;
        const tile = world.getTileAt(checkX, checkY);

        if (tile?.wall) {
          // Found a wall in this direction
          const progress = tile.wall.constructionProgress ?? 100;
          if (progress >= 100) {
            wallCount++;
            const material = tile.wall.material;
            totalInsulation += WALL_INSULATION[material] ?? 50;
          }
          break; // Stop looking further in this direction
        }
      }
    }

    // Need walls on at least 3 sides to be considered "indoors"
    let result: { insulation: number; baseTemp: number } | null = null;
    if (wallCount >= 3) {
      // Average insulation from walls, normalized to 0-1 range
      const avgInsulation = totalInsulation / wallCount / 100;
      result = {
        insulation: avgInsulation,
        baseTemp: 0, // Tile-based rooms don't have a base temp, just insulation
      };
    }

    // Cache result for next tick (cache cleared every 50 ticks)
    this.tileInsulationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Calculate heat bonus from nearby heat sources (campfires)
   * CRITICAL: Capped to prevent stacking multiple heat sources from creating lethal temperatures
   */
  private calculateHeatSourceBonus(position: PositionComponent): number {
    // Use cached buildings (refreshed every N ticks, not every frame!)
    const buildings = this.buildingCache;
    let totalHeat = 0;

    // Cap maximum heat contribution to prevent lethal stacking
    // Single campfire at 10°C is fine, but 5 campfires would be 50°C (lethal)
    const MAX_HEAT_CONTRIBUTION = 15; // Maximum total heat bonus from all sources

    for (const building of buildings) {
      const buildingPos = building.position;
      const buildingComp = building.component;

      // Check if building provides heat and is complete
      if (buildingComp.providesHeat && buildingComp.heatRadius > 0 && buildingComp.isComplete) {
        const dx = position.x - buildingPos.x;
        const dy = position.y - buildingPos.y;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSquared = buildingComp.heatRadius * buildingComp.heatRadius;

        if (distanceSquared <= radiusSquared) {
          // Heat effect diminishes with distance: heatAmount * (1 - distance / radius)
          // Note: Still need actual distance for falloff calculation
          const distance = Math.sqrt(distanceSquared);
          const heatEffect = buildingComp.heatAmount * (1 - distance / buildingComp.heatRadius);
          totalHeat += heatEffect;
        }
      }
    }

    // Cap total heat to prevent lethal stacking
    return Math.min(totalHeat, MAX_HEAT_CONTRIBUTION);
  }

  /**
   * Calculate temperature state based on current temperature and comfort ranges
   */
  private calculateTemperatureState(
    currentTemp: number,
    tempComponent: TemperatureComponent
  ): 'comfortable' | 'cold' | 'hot' | 'dangerously_cold' | 'dangerously_hot' {
    if (currentTemp < tempComponent.toleranceMin) {
      return 'dangerously_cold';
    }
    if (currentTemp > tempComponent.toleranceMax) {
      return 'dangerously_hot';
    }
    if (currentTemp < tempComponent.comfortMin) {
      return 'cold';
    }
    if (currentTemp > tempComponent.comfortMax) {
      return 'hot';
    }
    return 'comfortable';
  }

  /**
   * Update temperature-based health damage deltas.
   * Called once per game minute to register/update delta rates with StateMutatorSystem.
   */
  private updateTemperatureDeltas(
    entityId: string,
    temperatureState: TemperatureComponent['state']
  ): void {
    if (!this.stateMutator) {
      throw new Error('[TemperatureSystem] StateMutatorSystem not set - call setStateMutatorSystem() during initialization');
    }

    // Clean up old delta if it exists
    if (this.deltaCleanups.has(entityId)) {
      this.deltaCleanups.get(entityId)!();
      this.deltaCleanups.delete(entityId);
    }

    // Only register delta if in dangerous temperature
    if (temperatureState === 'dangerously_cold' || temperatureState === 'dangerously_hot') {
      // Convert HEALTH_DAMAGE_RATE (per second) to per game minute
      // Game time: 1 real second = ~1.2 game minutes (at 20 TPS with 600s day length)
      // So HEALTH_DAMAGE_RATE per real second = HEALTH_DAMAGE_RATE * 60 per game minute
      const healthDamagePerMinute = -(this.HEALTH_DAMAGE_RATE * 60);

      const cleanup = this.stateMutator.registerDelta({
        entityId,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: healthDamagePerMinute,
        min: 0,
        max: 100,
        source: `temperature_damage_${temperatureState}`,
      });

      this.deltaCleanups.set(entityId, cleanup);
    }
  }

  /**
   * Check for temperature state changes and emit events
   */
  private checkTemperatureEvents(world: World, entity: Entity, tempComp: TemperatureComponent): void {
    const wasDangerous = this.previousDangerousStates.get(entity.id) || false;
    const isDangerous = tempComp.state === 'dangerously_cold' || tempComp.state === 'dangerously_hot';

    if (isDangerous && !wasDangerous) {
      // Entered dangerous temperature range
      const needsComp = entity.components.get('needs') as NeedsComponent | undefined;
      const health = needsComp?.health ?? 100;
      world.eventBus.emit({
        type: 'temperature:danger',
        source: entity.id,
        data: {
          agentId: entity.id,
          entityId: entity.id,
          temperature: tempComp.currentTemp,
          health: health,
          state: tempComp.state,
        },
      });
    } else if (!isDangerous && wasDangerous) {
      // Exited dangerous temperature range
      world.eventBus.emit({
        type: 'temperature:comfortable',
        source: entity.id,
        data: {
        agentId: entity.id,
        entityId: entity.id,
          temperature: tempComp.currentTemp,
          state: tempComp.state,
        },
      });
    }

    this.previousDangerousStates.set(entity.id, isDangerous);
  }
}
