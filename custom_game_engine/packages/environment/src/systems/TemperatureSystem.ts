import type {
  SystemId,
  ComponentType,
  ITile,
  TemperatureComponent,
  PositionComponent,
  NeedsComponent,
  BuildingComponent,
  WeatherComponent
} from '@ai-village/core';
import {
  ComponentType as CT,
  BaseSystem,
  type SystemContext,
  type ComponentAccessor,
  EntityImpl,
  HEALTH_DAMAGE_RATE,
  WORLD_TEMP_BASE,
  TEMP_DAILY_VARIATION,
  THERMAL_CHANGE_RATE,
  HEALTH_CRITICAL,
} from '@ai-village/core';
import { type Tile } from '@ai-village/world';

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
interface WorldWithTiles {
  getTileAt(x: number, y: number): ITile | undefined;
}

// Chunk spatial query injection for efficient nearby entity lookups
let chunkSpatialQuery: any | null = null;

export function injectChunkSpatialQueryToTemperature(spatialQuery: any): void {
  chunkSpatialQuery = spatialQuery;
  console.log('[TemperatureSystem] ChunkSpatialQuery injected for efficient proximity checks');
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
  protected readonly throttleInterval = 10; // FAST - 0.5 seconds

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides time of day for daily temperature cycles
   * @see WeatherSystem - provides weather modifiers (tempModifier) affecting ambient temperature
   */
  public readonly dependsOn = ['time', 'weather'] as const;

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

  protected onUpdate(ctx: SystemContext): void {
    // Calculate world ambient temperature (uses cached time entity)
    this.currentWorldTemp = this.calculateWorldTemperature(ctx.world);

    // Get weather modifier once (uses cached weather entity)
    const weatherModifier = this.getWeatherModifier(ctx.world);

    // Update building cache if needed (only every N ticks, not every frame!)
    if (ctx.tick - this.buildingCacheLastUpdate > this.BUILDING_CACHE_DURATION) {
      this.refreshBuildingCache(ctx.world);
      this.buildingCacheLastUpdate = ctx.tick;
    }

    // Clear tile insulation cache periodically (walls can be built/destroyed)
    if (ctx.tick - this.tileInsulationCacheLastUpdate > this.TILE_CACHE_DURATION) {
      this.tileInsulationCache.clear();
      this.tileInsulationCacheLastUpdate = ctx.tick;
    }

    // Filter entities with required components
    const temperatureEntities = ctx.activeEntities.filter(e =>
      e.components.has(CT.Temperature) && e.components.has(CT.Position)
    );

    // Determine which entities should be actively simulated
    // Only simulate temperature for entities near agents (within 50 tiles)
    const ACTIVE_SIMULATION_RADIUS = 50;
    const ACTIVE_SIMULATION_RADIUS_SQ = ACTIVE_SIMULATION_RADIUS * ACTIVE_SIMULATION_RADIUS;

    // Set to track entities that should be simulated this tick
    const activeEntityIds = new Set<string>();

    // Fast path: Use chunk queries to find entities near agents (O(M × E_chunk))
    if (chunkSpatialQuery) {
      const agents = ctx.world.query()
        .with(CT.Agent)
        .with(CT.Position)
        .executeEntities();

      for (const agent of agents) {
        const agentImpl = agent as EntityImpl;
        const agentPos = agentImpl.getComponent<PositionComponent>(CT.Position);

        if (!agentPos) continue;

        // Always simulate agents themselves
        activeEntityIds.add(agent.id);

        // Find all temperature entities within radius of this agent
        const nearbyEntities = chunkSpatialQuery.getEntitiesInRadius(
          agentPos.x,
          agentPos.y,
          ACTIVE_SIMULATION_RADIUS,
          [CT.Temperature]
        );

        for (const { entity } of nearbyEntities) {
          activeEntityIds.add(entity.id);
        }
      }
    } else {
      // Fallback: Global query with distance checking (O(N × M))
      const agentPositions = ctx.world.query()
        .with(CT.Agent)
        .with(CT.Position)
        .executeEntities()
        .map(e => (e as EntityImpl).getComponent<PositionComponent>(CT.Position)!);

      for (const entity of temperatureEntities) {
        const isAgent = entity.components.has(CT.Agent);

        // Agents always simulate
        if (isAgent) {
          activeEntityIds.add(entity.id);
          continue;
        }

        // Check if near any agent
        if (agentPositions.length > 0) {
          const impl = entity as EntityImpl;
          const posComp = impl.getComponent<PositionComponent>(CT.Position)!;

          const isNearAgent = agentPositions.some(agentPos => {
            const dx = posComp.x - agentPos.x;
            const dy = posComp.y - agentPos.y;
            return dx * dx + dy * dy <= ACTIVE_SIMULATION_RADIUS_SQ;
          });

          if (isNearAgent) {
            activeEntityIds.add(entity.id);
          }
        }
      }
    }

    // Process each entity with temperature
    for (const entity of temperatureEntities) {
      // Skip entities not in active set
      if (!activeEntityIds.has(entity.id)) {
        continue;
      }

      const impl = entity as EntityImpl;
      const posComp = impl.getComponent<PositionComponent>(CT.Position)!;

      // Calculate agent's effective temperature
      let effectiveTemp = this.currentWorldTemp;

      // Apply weather modifier (already fetched once)
      effectiveTemp += weatherModifier;

      // Apply building effects (insulation + base temp) - uses cache
      const buildingEffect = this.calculateBuildingEffect(ctx.world, posComp);
      if (buildingEffect !== null) {
        // Formula: effectiveTemp = ambientTemp * (1 - insulation) + baseTemp
        effectiveTemp = effectiveTemp * (1 - buildingEffect.insulation) + buildingEffect.baseTemp;
      }

      // Apply heat source effects - uses cache
      const heatBonus = this.calculateHeatSourceBonus(posComp);
      effectiveTemp += heatBonus;

      // Get current temperature component to apply thermal inertia
      const currentTempComp = impl.getComponent<TemperatureComponent>(CT.Temperature)!;

      // Gradually adjust body temperature toward environmental temperature (thermal inertia)
      // Body temperature changes slowly, not instantly
      const tempDiff = effectiveTemp - currentTempComp.currentTemp;
      const tempChange = tempDiff * this.THERMAL_RATE * ctx.deltaTime;
      const newTemp = currentTempComp.currentTemp + tempChange;

      // Update agent temperature with gradual change
      impl.updateComponent<TemperatureComponent>(CT.Temperature, (current) => ({
        ...current,
        currentTemp: newTemp,
        state: this.calculateTemperatureState(newTemp, current),
      }));

      // Get updated component after state calculation
      const updatedTemp = impl.getComponent<TemperatureComponent>(CT.Temperature)!;

      // Check for state transitions and emit events
      this.checkTemperatureEvents(ctx, entity, updatedTemp);

      // Apply health damage if in dangerous temperature
      if (updatedTemp.state === 'dangerously_cold' || updatedTemp.state === 'dangerously_hot') {
        const needsComp = impl.getComponent<NeedsComponent>(CT.Needs);
        if (needsComp) {
          const healthLoss = this.HEALTH_DAMAGE_RATE * ctx.deltaTime;
          const newHealth = Math.max(0, needsComp.health - healthLoss);

          // Direct mutation for class-based components
          needsComp.health = newHealth;

          // Emit critical health event if health drops below 20%
          if (newHealth < HEALTH_CRITICAL && needsComp.health >= HEALTH_CRITICAL) {
            ctx.emit('agent:health_critical', {
              agentId: entity.id,
              entityId: entity.id,
              health: newHealth
            }, entity.id);
          }
        }
      }
    }
  }

  /**
   * Calculate world ambient temperature based on time and season
   */
  private calculateWorldTemperature(world: any): number {
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
  private getWeatherModifier(world: any): number {
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
  private refreshBuildingCache(world: any): void {
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
    world: any,
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
        const radiusSquared = buildingComp.interiorRadius * buildingComp.interiorRadius;

        if (distanceSquared <= radiusSquared) {
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
    // Get starting tile once (use graph neighbors for traversal)
    const startTile = world.getTileAt(tileX, tileY) as Tile | null;
    if (!startTile) {
      // Tile doesn't exist (shouldn't happen after chunk check, but be defensive)
      this.tileInsulationCache.set(cacheKey, null);
      return null;
    }

    // Check for walls in all 4 cardinal directions (within 3 tiles)
    // Use neighbor pointer chaining for 10x performance vs getTileAt
    const directionKeys = ['north', 'south', 'west', 'east'] as const;

    let wallCount = 0;
    let totalInsulation = 0;
    const maxDistance = 3; // Check up to 3 tiles in each direction

    for (const dirKey of directionKeys) {
      // Start with immediate neighbor in this direction
      let currentTile: Tile | null = startTile.neighbors?.[dirKey] ?? null;

      // Chain through neighbors in same direction
      for (let dist = 1; dist <= maxDistance && currentTile; dist++) {
        if (currentTile.wall) {
          // Found a wall in this direction
          const progress = currentTile.wall.constructionProgress ?? 100;
          if (progress >= 100) {
            wallCount++;
            const material = currentTile.wall.material;
            totalInsulation += WALL_INSULATION[material] ?? 50;
          }
          break; // Stop looking further in this direction
        }
        // Chain to next neighbor in same direction
        currentTile = currentTile.neighbors?.[dirKey] ?? null;
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
          // Note: We need actual distance here for interpolation, but only compute after squared check passes
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
   * Check for temperature state changes and emit events
   */
  private checkTemperatureEvents(ctx: SystemContext, entity: any, tempComp: TemperatureComponent): void {
    const wasDangerous = this.previousDangerousStates.get(entity.id) || false;
    const isDangerous = tempComp.state === 'dangerously_cold' || tempComp.state === 'dangerously_hot';

    if (isDangerous && !wasDangerous) {
      // Entered dangerous temperature range
      const needsComp = entity.components.get('needs') as NeedsComponent | undefined;
      const health = needsComp?.health ?? 100;
      ctx.emit('temperature:danger', {
        agentId: entity.id,
        entityId: entity.id,
        temperature: tempComp.currentTemp,
        health: health,
        state: tempComp.state,
      }, entity.id);
    } else if (!isDangerous && wasDangerous) {
      // Exited dangerous temperature range
      ctx.emit('temperature:comfortable', {
        agentId: entity.id,
        entityId: entity.id,
        temperature: tempComp.currentTemp,
        state: tempComp.state,
      }, entity.id);
    }

    this.previousDangerousStates.set(entity.id, isDangerous);
  }
}
