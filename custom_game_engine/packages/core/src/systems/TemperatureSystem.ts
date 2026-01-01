import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World, ITile } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { TemperatureComponent } from '../components/TemperatureComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { WeatherComponent } from '../components/WeatherComponent.js';
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

export class TemperatureSystem implements System {
  public readonly id: SystemId = 'temperature';
  public readonly priority: number = 14; // Run after weather (5), before needs (15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Temperature,
    CT.Position,
  ];

  private readonly HEALTH_DAMAGE_RATE = HEALTH_DAMAGE_RATE; // Health damage per second in dangerous temps
  private readonly BASE_TEMP = WORLD_TEMP_BASE; // Default world temperature in °C
  private readonly DAILY_VARIATION = TEMP_DAILY_VARIATION; // ±8°C daily temperature swing
  private readonly THERMAL_RATE = THERMAL_CHANGE_RATE; // Rate of temperature change per second (0.15 = ~7 seconds to change 1°C)
  private currentWorldTemp: number = this.BASE_TEMP;
  private previousDangerousStates = new Map<string, boolean>();

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Calculate world ambient temperature
    this.currentWorldTemp = this.calculateWorldTemperature(world);

    // Filter entities with required components
    const temperatureEntities = entities.filter(e =>
      e.components.has(CT.Temperature) && e.components.has(CT.Position)
    );

    // Process each entity with temperature
    for (const entity of temperatureEntities) {
      const impl = entity as EntityImpl;
      const posComp = impl.getComponent<PositionComponent>(CT.Position)!;

      // Calculate agent's effective temperature
      let effectiveTemp = this.currentWorldTemp;

      // Apply weather modifier
      const weatherModifier = this.getWeatherModifier(world);
      effectiveTemp += weatherModifier;

      // Apply building effects (insulation + base temp)
      const buildingEffect = this.calculateBuildingEffect(world, posComp);
      if (buildingEffect !== null) {
        // Formula: effectiveTemp = ambientTemp * (1 - insulation) + baseTemp
        effectiveTemp = effectiveTemp * (1 - buildingEffect.insulation) + buildingEffect.baseTemp;
      }

      // Apply heat source effects
      const heatBonus = this.calculateHeatSourceBonus(world, posComp);
      effectiveTemp += heatBonus;

      // Get current temperature component to apply thermal inertia
      const currentTempComp = impl.getComponent<TemperatureComponent>(CT.Temperature)!;

      // Gradually adjust body temperature toward environmental temperature (thermal inertia)
      // Body temperature changes slowly, not instantly
      const tempDiff = effectiveTemp - currentTempComp.currentTemp;
      const tempChange = tempDiff * this.THERMAL_RATE * deltaTime;
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
      this.checkTemperatureEvents(world, entity, updatedTemp);

      // Apply health damage if in dangerous temperature
      if (updatedTemp.state === 'dangerously_cold' || updatedTemp.state === 'dangerously_hot') {
        const needsComp = impl.getComponent<NeedsComponent>(CT.Needs);
        if (needsComp) {
          const healthLoss = this.HEALTH_DAMAGE_RATE * deltaTime;
          const newHealth = Math.max(0, needsComp.health - healthLoss);

          impl.updateComponent<NeedsComponent>(CT.Needs, (current) => {
            const updated = current.clone();
            updated.health = newHealth;
            return updated;
          });

          // Emit critical health event if health drops below 20%
          if (newHealth < HEALTH_CRITICAL && needsComp.health >= HEALTH_CRITICAL) {
            world.eventBus.emit({
              type: 'agent:health_critical',
              source: entity.id,
              data: { agentId: entity.id,
            entityId: entity.id,
            health: newHealth },
            });
          }
        }
      }
    }
  }

  /**
   * Calculate world ambient temperature based on time and season
   */
  private calculateWorldTemperature(world: World): number {
    // Find time entity to get current game time
    let timeOfDay = 12; // Default noon if no time entity
    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const timeComp = impl.getComponent<any>('time');
      if (timeComp) {
        timeOfDay = timeComp.timeOfDay;
        break;
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
    // Find world entity with weather component
    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const weather = impl.getComponent<WeatherComponent>(CT.Weather);
      if (weather) {
        return weather.tempModifier;
      }
    }
    return 0;
  }

  /**
   * Calculate building insulation and base temperature effect.
   * Checks both legacy entity-based buildings AND tile-based walls.
   */
  private calculateBuildingEffect(
    world: World,
    position: PositionComponent
  ): { insulation: number; baseTemp: number } | null {
    // First check legacy entity-based buildings
    const buildings = this.findNearbyBuildings(world);

    for (const building of buildings) {
      const buildingPos = building.position;
      const buildingComp = building.component;

      // Check if agent is inside building interior
      if (buildingComp.interior && buildingComp.interiorRadius > 0) {
        const distance = Math.sqrt(
          Math.pow(position.x - buildingPos.x, 2) + Math.pow(position.y - buildingPos.y, 2)
        );

        if (distance <= buildingComp.interiorRadius) {
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
   */
  private calculateTileBasedInsulation(
    world: WorldWithTiles,
    position: PositionComponent
  ): { insulation: number; baseTemp: number } | null {
    const tileX = Math.floor(position.x);
    const tileY = Math.floor(position.y);

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
    if (wallCount >= 3) {
      // Average insulation from walls, normalized to 0-1 range
      const avgInsulation = totalInsulation / wallCount / 100;
      return {
        insulation: avgInsulation,
        baseTemp: 0, // Tile-based rooms don't have a base temp, just insulation
      };
    }

    return null;
  }

  /**
   * Calculate heat bonus from nearby heat sources (campfires)
   */
  private calculateHeatSourceBonus(world: World, position: PositionComponent): number {
    const buildings = this.findNearbyBuildings(world);
    let totalHeat = 0;

    for (const building of buildings) {
      const buildingPos = building.position;
      const buildingComp = building.component;

      // Check if building provides heat and is complete
      if (buildingComp.providesHeat && buildingComp.heatRadius > 0 && buildingComp.isComplete) {
        const distance = Math.sqrt(
          Math.pow(position.x - buildingPos.x, 2) + Math.pow(position.y - buildingPos.y, 2)
        );

        if (distance <= buildingComp.heatRadius) {
          // Heat effect diminishes with distance: heatAmount * (1 - distance / radius)
          const heatEffect = buildingComp.heatAmount * (1 - distance / buildingComp.heatRadius);
          totalHeat += heatEffect;
        }
      }
    }

    return totalHeat;
  }

  /**
   * Find all buildings in the world
   */
  private findNearbyBuildings(world: World): Array<{
    position: PositionComponent;
    component: BuildingComponent;
  }> {
    const buildings: Array<{ position: PositionComponent; component: BuildingComponent }> = [];

    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const buildingComp = impl.getComponent<BuildingComponent>(CT.Building);
      const posComp = impl.getComponent<PositionComponent>(CT.Position);

      if (buildingComp && posComp) {
        buildings.push({
          position: posComp,
          component: buildingComp,
        });
      }
    }

    return buildings;
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
