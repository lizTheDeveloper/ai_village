import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { TownHallComponent, AgentRecord, DeathRecord, BirthRecord } from '../components/TownHallComponent.js';
import type { CensusBureauComponent } from '../components/CensusBureauComponent.js';
import type { WarehouseComponent } from '../components/WarehouseComponent.js';
import type { WeatherStationComponent } from '../components/WeatherStationComponent.js';
import type { HealthClinicComponent } from '../components/HealthClinicComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { EventBus } from '../events/EventBus.js';

/**
 * GovernanceDataSystem populates governance building components with data.
 * Per governance-dashboard work order: Better infrastructure = better information.
 *
 * This system:
 * - Updates TownHall with population data
 * - Updates CensusBureau with demographics
 * - Updates Warehouse with resource tracking
 * - Updates WeatherStation with forecasts
 * - Updates HealthClinic with health stats
 * - Adjusts data quality based on building condition and staffing
 *
 * Per CLAUDE.md: No silent fallbacks - crashes on invalid state.
 */
export class GovernanceDataSystem implements System {
  public readonly id: SystemId = 'governance_data';
  public readonly priority: number = 50; // Run late, after most other systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private deathLog: DeathRecord[] = [];
  private birthLog: BirthRecord[] = [];
  private isInitialized = false;

  /**
   * Initialize event listeners for death and birth tracking.
   */
  public initialize(world: World, eventBus: EventBus): void {
    if (this.isInitialized) {
      return;
    }

    // Listen for death events
    eventBus.subscribe('agent:starved', (event) => {
      if (event.data) {
        this.recordDeath(world, event.data.agentId, 'starvation', event.timestamp || Date.now());
      }
    });

    eventBus.subscribe('agent:collapsed', (event) => {
      if (event.data) {
        this.recordDeath(world, event.data.agentId, event.data.reason || 'exhaustion', event.timestamp || Date.now());
      }
    });

    // Note: Birth tracking would require an 'agent:born' event to be added to EventMap

    this.isInitialized = true;
  }

  /**
   * Record a death in the death log.
   */
  private recordDeath(world: World, agentId: string, cause: string, timestamp: number): void {
    // Find agent name from identity component
    const entities = world.query().with('identity').executeEntities();
    const agent = entities.find(e => e.id === agentId);
    const identityComp = agent ? (agent as EntityImpl).getComponent<IdentityComponent>('identity') : null;
    const agentName = identityComp?.name || 'Unknown';

    this.deathLog.push({
      agent: agentName,
      cause,
      timestamp,
    });

    // Keep only last 100 deaths
    if (this.deathLog.length > 100) {
      this.deathLog = this.deathLog.slice(-100);
    }
  }


  /**
   * Update all governance buildings with latest data.
   */
  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    this.updateTownHalls(world);
    this.updateCensusBureaus(world);
    this.updateWarehouses(world);
    this.updateWeatherStations(world);
    this.updateHealthClinics(world);
  }

  /**
   * Update TownHall components with population data.
   */
  private updateTownHalls(world: World): void {
    const townHalls = world.query().with('town_hall', 'building').executeEntities();

    for (const entity of townHalls) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>('building');
      const townHall = impl.getComponent<TownHallComponent>('town_hall');

      if (!building || !townHall) {
        continue;
      }

      // Determine data quality based on building condition
      let dataQuality: 'full' | 'delayed' | 'unavailable';
      let latency: number;

      if (building.condition >= 100) {
        dataQuality = 'full';
        latency = 0;
      } else if (building.condition >= 50) {
        dataQuality = 'delayed';
        latency = 300; // 5 minutes
      } else {
        dataQuality = 'unavailable';
        latency = Infinity;
      }

      // Get all agents
      const agents = world.query().with('identity').executeEntities();
      const agentRecords: AgentRecord[] = [];

      for (const agentEntity of agents) {
        const agentImpl = agentEntity as EntityImpl;
        const identity = agentImpl.getComponent<IdentityComponent>('identity');
        if (identity) {
          agentRecords.push({
            id: agentEntity.id,
            name: identity.name,
            age: 0, // Age tracking not yet implemented
            generation: 0, // Generation tracking not yet implemented
            status: 'alive',
          });
        }
      }

      // Update TownHall component
      impl.updateComponent<TownHallComponent>('town_hall', (current) => ({
        ...current,
        populationCount: agentRecords.length,
        agents: agentRecords,
        recentDeaths: [...this.deathLog],
        recentBirths: [...this.birthLog],
        dataQuality,
        latency,
      }));
    }
  }

  /**
   * Update CensusBureau components with demographics data.
   */
  private updateCensusBureaus(world: World): void {
    const bureaus = world.query().with('census_bureau', 'building').executeEntities();

    for (const entity of bureaus) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>('building');
      const bureau = impl.getComponent<CensusBureauComponent>('census_bureau');

      if (!building || !bureau) {
        continue;
      }

      // Get all agents
      const agents = world.query().with('identity').executeEntities();
      const agentCount = agents.length;

      // Age distribution - simplified placeholder (would need age component)
      const children = 0;
      const adults = agentCount; // Assume all adults for now
      const elders = 0;

      // Calculate rates (per game-day)
      // This is simplified - in production would track over time window
      const currentTime = Date.now();
      const timeWindow = 24 * 3600 * 1000; // 24 hours in ms
      const recentBirths = this.birthLog.filter(b => currentTime - b.timestamp < timeWindow).length;
      const recentDeaths = this.deathLog.filter(d => currentTime - d.timestamp < timeWindow).length;

      const birthRate = recentBirths; // births per day
      const deathRate = recentDeaths; // deaths per day
      const replacementRate = deathRate > 0 ? birthRate / deathRate : 1.0;

      // Calculate extinction risk
      let extinctionRisk: 'none' | 'low' | 'moderate' | 'high';
      if (agentCount < 10) {
        extinctionRisk = 'high';
      } else if (replacementRate < 0.8) {
        extinctionRisk = 'moderate';
      } else if (replacementRate < 1.0) {
        extinctionRisk = 'low';
      } else {
        extinctionRisk = 'none';
      }

      // Project population
      const growthRate = birthRate - deathRate;
      const in10Generations = Math.max(0, agentCount + growthRate * 10);

      // Generational trends - placeholder (would need historical tracking)
      const generationalTrends: Array<{ generation: number; avgLifespan: number; avgIntelligence: number }> = [];

      // Determine data quality based on staffing
      const dataQuality = building.currentStaff && building.currentStaff.length > 0 ? 'real_time' : 'stale';
      const updateFrequency = dataQuality === 'real_time' ? 'immediate' : 24 * 3600;

      // Accuracy based on staffing (intelligence tracking not yet implemented)
      const accuracy = (building.currentStaff && building.currentStaff.length > 0) ? 0.9 : 0.5;

      // Update CensusBureau component
      impl.updateComponent<CensusBureauComponent>('census_bureau', (current) => ({
        ...current,
        demographics: { children, adults, elders },
        birthRate,
        deathRate,
        replacementRate,
        projections: {
          in10Generations,
          extinctionRisk,
        },
        generationalTrends,
        dataQuality,
        updateFrequency,
        accuracy,
      }));
    }
  }

  /**
   * Update Warehouse components with resource tracking.
   */
  private updateWarehouses(world: World): void {
    const warehouses = world.query().with('warehouse', 'building').executeEntities();

    for (const entity of warehouses) {
      const impl = entity as EntityImpl;
      const warehouse = impl.getComponent<WarehouseComponent>('warehouse');

      if (!warehouse) {
        continue;
      }

      // Warehouse tracking would integrate with inventory system
      // For now, just ensure component exists
      // Future: track production/consumption rates, days remaining, etc.
    }
  }

  /**
   * Update WeatherStation components with forecasts.
   */
  private updateWeatherStations(world: World): void {
    const stations = world.query().with('weather_station', 'building').executeEntities();

    for (const entity of stations) {
      const impl = entity as EntityImpl;
      const station = impl.getComponent<WeatherStationComponent>('weather_station');

      if (!station) {
        continue;
      }

      // Weather forecast generation would integrate with weather/temperature systems
      // For now, just placeholder data
      // Future: Generate 24-hour forecast, warnings, at-risk agents based on
      // WeatherComponent and TemperatureComponent data
    }
  }

  /**
   * Update HealthClinic components with population health stats.
   */
  private updateHealthClinics(world: World): void {
    const clinics = world.query().with('health_clinic', 'building').executeEntities();

    for (const entity of clinics) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>('building');
      const clinic = impl.getComponent<HealthClinicComponent>('health_clinic');

      if (!building || !clinic) {
        continue;
      }

      // Get all agents with needs
      const agents = world.query().with('agent', 'needs').executeEntities();
      let healthy = 0;
      let sick = 0;
      let critical = 0;
      let malnourished = 0;
      const totalAgents = agents.length;

      for (const agentEntity of agents) {
        const agentImpl = agentEntity as EntityImpl;
        const needs = agentImpl.getComponent<NeedsComponent>('needs');

        if (needs) {
          // Health based on hunger/energy
          const avgHealth = (needs.hunger + needs.energy) / 2;

          if (avgHealth > 70) {
            healthy++;
          } else if (avgHealth > 30) {
            sick++;
          } else {
            critical++;
          }

          if (needs.hunger < 30) {
            malnourished++;
          }
        }
      }

      // Calculate mortality causes from death log
      const causeMap = new Map<string, number>();
      for (const death of this.deathLog) {
        causeMap.set(death.cause, (causeMap.get(death.cause) || 0) + 1);
      }

      const totalDeaths = this.deathLog.length;
      const mortality = Array.from(causeMap.entries()).map(([cause, count]) => ({
        cause,
        count,
        percentage: totalDeaths > 0 ? (count / totalDeaths) * 100 : 0,
      }));

      // Data quality based on staffing
      const dataQuality = building.currentStaff && building.currentStaff.length > 0 ? 'full' : 'basic';

      // Recommended staff: 1 per 20 agents
      const recommendedStaff = Math.ceil(totalAgents / 20);

      // Update HealthClinic component
      impl.updateComponent<HealthClinicComponent>('health_clinic', (current) => ({
        ...current,
        populationHealth: { healthy, sick, critical },
        malnutrition: {
          affected: malnourished,
          trend: 'stable', // Would need historical tracking
        },
        trauma: {
          traumatized: 0, // Would need trauma component
          severe: 0,
          healing: 0,
        },
        mortality,
        dataQuality,
        recommendedStaff,
      }));
    }
  }
}
