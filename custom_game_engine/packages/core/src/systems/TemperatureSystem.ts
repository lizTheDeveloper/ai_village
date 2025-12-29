import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
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

export class TemperatureSystem implements System {
  public readonly id: SystemId = 'temperature';
  public readonly priority: number = 14; // Run after weather (5), before needs (15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    'temperature',
    'position',
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
      e.components.has('temperature') && e.components.has('position')
    );

    // Process each entity with temperature
    for (const entity of temperatureEntities) {
      const impl = entity as EntityImpl;
      const posComp = impl.getComponent<PositionComponent>('position')!;

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
      const currentTempComp = impl.getComponent<TemperatureComponent>('temperature')!;

      // Gradually adjust body temperature toward environmental temperature (thermal inertia)
      // Body temperature changes slowly, not instantly
      const tempDiff = effectiveTemp - currentTempComp.currentTemp;
      const tempChange = tempDiff * this.THERMAL_RATE * deltaTime;
      const newTemp = currentTempComp.currentTemp + tempChange;

      // Update agent temperature with gradual change
      impl.updateComponent<TemperatureComponent>('temperature', (current) => ({
        ...current,
        currentTemp: newTemp,
        state: this.calculateTemperatureState(newTemp, current),
      }));

      // Get updated component after state calculation
      const updatedTemp = impl.getComponent<TemperatureComponent>('temperature')!;

      // Check for state transitions and emit events
      this.checkTemperatureEvents(world, entity, updatedTemp);

      // Apply health damage if in dangerous temperature
      if (updatedTemp.state === 'dangerously_cold' || updatedTemp.state === 'dangerously_hot') {
        const needsComp = impl.getComponent<NeedsComponent>('needs');
        if (needsComp) {
          const healthLoss = this.HEALTH_DAMAGE_RATE * deltaTime;
          const newHealth = Math.max(0, needsComp.health - healthLoss);

          impl.updateComponent<NeedsComponent>('needs', (current) => ({
            ...current,
            health: newHealth,
          }));

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
      const weather = impl.getComponent<WeatherComponent>('weather');
      if (weather) {
        return weather.tempModifier;
      }
    }
    return 0;
  }

  /**
   * Calculate building insulation and base temperature effect
   */
  private calculateBuildingEffect(
    world: World,
    position: PositionComponent
  ): { insulation: number; baseTemp: number } | null {
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
      const buildingComp = impl.getComponent<BuildingComponent>('building');
      const posComp = impl.getComponent<PositionComponent>('position');

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
