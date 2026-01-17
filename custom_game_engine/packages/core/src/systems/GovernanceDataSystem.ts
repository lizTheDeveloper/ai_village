import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { TownHallComponent, AgentRecord, DeathRecord, BirthRecord } from '../components/TownHallComponent.js';
import type { CensusBureauComponent } from '../components/CensusBureauComponent.js';
import type { WarehouseComponent } from '../components/WarehouseComponent.js';
import type { WeatherStationComponent } from '../components/WeatherStationComponent.js';
import type { HealthClinicComponent } from '../components/HealthClinicComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';

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
export class GovernanceDataSystem extends BaseSystem {
  public readonly id: SystemId = 'governance_data';
  public readonly priority: number = 50; // Run late, after most other systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private deathLog: DeathRecord[] = [];
  private birthLog: BirthRecord[] = [];

  // Performance: Government data updates at midnight (once per game day)
  private needsUpdate = true; // Update on first tick, then wait for day change events

  /**
   * Initialize event listeners for death/birth tracking and day change events.
   */
  protected onInitialize(world: World, eventBus: EventBus): void {
    // Listen for day change events from TimeSystem
    this.events.subscribe('time:day_changed', () => {
      this.needsUpdate = true; // Flag for update at midnight
    });

    // Listen for death events
    this.events.subscribe('agent:starved', (event) => {
      if (event.data) {
        // Per CLAUDE.md: No silent fallbacks - require all fields
        if (!event.timestamp) {
          throw new Error(`Death event (agent:starved) for agent ${event.data.agentId} missing required 'timestamp' field`);
        }
        this.recordDeath(world, event.data.agentId, 'starvation', event.timestamp);
      }
    });

    this.events.subscribe('agent:collapsed', (event) => {
      if (event.data) {
        // Per CLAUDE.md: No silent fallbacks - require all fields
        if (!event.data.reason) {
          throw new Error(`Death event (agent:collapsed) for agent ${event.data.agentId} missing required 'reason' field`);
        }
        if (!event.timestamp) {
          throw new Error(`Death event (agent:collapsed) for agent ${event.data.agentId} missing required 'timestamp' field`);
        }
        this.recordDeath(world, event.data.agentId, event.data.reason, event.timestamp);
      }
    });

    // Note: Birth tracking would require an 'agent:born' event to be added to EventMap
  }

  /**
   * Record a death in the death log.
   */
  private recordDeath(world: World, agentId: string, cause: string, timestamp: number): void {
    // Find agent name from identity component
    const entities = world.query().with(CT.Identity).executeEntities();
    const agent = entities.find(e => e.id === agentId);
    const identityComp = agent ? (agent as EntityImpl).getComponent<IdentityComponent>(CT.Identity) : null;

    // Per CLAUDE.md: No silent fallbacks - require identity component with name
    if (!identityComp) {
      throw new Error(`Agent ${agentId} missing required CT.Identity component for death recording`);
    }
    if (!identityComp.name) {
      throw new Error(`Agent ${agentId} identity component missing required 'name' field`);
    }
    const agentName = identityComp.name;

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
   * Performance:
   * - Event-driven: Updates at midnight when TimeSystem emits 'time:day_changed'
   * - Early exit if no governance buildings exist
   * - Single query for all agents, passed to all methods
   */
  protected onUpdate(ctx: SystemContext): void {
    // Performance: Only update when flagged by day change event
    if (!this.needsUpdate) {
      return;
    }
    this.needsUpdate = false; // Reset flag

    // Performance: Early exit if no governance buildings exist
    // Check all governance building types in a single pass
    const hasAnyGovernanceBuilding =
      ctx.world.query().with(CT.TownHall).executeEntities().length > 0 ||
      ctx.world.query().with(CT.CensusBureau).executeEntities().length > 0 ||
      ctx.world.query().with(CT.Warehouse).executeEntities().length > 0 ||
      ctx.world.query().with(CT.WeatherStation).executeEntities().length > 0 ||
      ctx.world.query().with(CT.HealthClinic).executeEntities().length > 0;

    if (!hasAnyGovernanceBuilding) {
      return;
    }

    // Single query for identity agents (used by TownHalls and CensusBureaus)
    const agentsWithIdentity = ctx.world.query().with(CT.Identity).executeEntities();

    // Single query for agents with needs (used by HealthClinics)
    const agentsWithNeeds = ctx.world.query().with(CT.Agent, CT.Needs).executeEntities();

    this.updateTownHalls(ctx.world, agentsWithIdentity);
    this.updateCensusBureaus(ctx.world, agentsWithIdentity);
    this.updateWarehouses(ctx.world);
    this.updateWeatherStations(ctx.world);
    this.updateHealthClinics(ctx.world, agentsWithNeeds);
  }

  /**
   * Update TownHall components with population data.
   * Performance: Uses pre-queried agents to avoid repeated queries
   */
  private updateTownHalls(world: World, agents: ReadonlyArray<Entity>): void {
    const townHalls = world.query().with(CT.TownHall, CT.Building).executeEntities();

    for (const entity of townHalls) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>(CT.Building);
      const townHall = impl.getComponent<TownHallComponent>(CT.TownHall);

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

      // Use pre-queried agents instead of querying again
      const agentRecords: AgentRecord[] = [];

      for (const agentEntity of agents) {
        const agentImpl = agentEntity as EntityImpl;
        const identity = agentImpl.getComponent<IdentityComponent>(CT.Identity);
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
      impl.updateComponent<TownHallComponent>(CT.TownHall, (current) => ({
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
   * Performance: Uses pre-queried agents to avoid repeated queries
   */
  private updateCensusBureaus(world: World, agents: ReadonlyArray<Entity>): void {
    const bureaus = world.query().with(CT.CensusBureau, CT.Building).executeEntities();

    for (const entity of bureaus) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>(CT.Building);
      const bureau = impl.getComponent<CensusBureauComponent>(CT.CensusBureau);

      if (!building || !bureau) {
        continue;
      }

      // Use pre-queried agents instead of querying again
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
      impl.updateComponent<CensusBureauComponent>(CT.CensusBureau, (current) => ({
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
    const warehouses = world.query().with(CT.Warehouse, CT.Building).executeEntities();

    for (const entity of warehouses) {
      const impl = entity as EntityImpl;
      const warehouse = impl.getComponent<WarehouseComponent>(CT.Warehouse);

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
    const stations = world.query().with(CT.WeatherStation, CT.Building).executeEntities();

    for (const entity of stations) {
      const impl = entity as EntityImpl;
      const station = impl.getComponent<WeatherStationComponent>(CT.WeatherStation);

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
   * Performance: Uses pre-queried agents to avoid repeated queries
   */
  private updateHealthClinics(world: World, agents: ReadonlyArray<Entity>): void {
    const clinics = world.query().with(CT.HealthClinic, CT.Building).executeEntities();

    for (const entity of clinics) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>(CT.Building);
      const clinic = impl.getComponent<HealthClinicComponent>(CT.HealthClinic);

      if (!building || !clinic) {
        continue;
      }

      // Use pre-queried agents instead of querying again
      let healthy = 0;
      let sick = 0;
      let critical = 0;
      let malnourished = 0;
      const totalAgents = agents.length;

      for (const agentEntity of agents) {
        const agentImpl = agentEntity as EntityImpl;
        const needs = agentImpl.getComponent<NeedsComponent>(CT.Needs);

        if (needs) {
          // Health based on hunger/energy
          const avgHealth = (needs.hunger + needs.energy) / 2;

          if (avgHealth > 0.7) {
            healthy++;
          } else if (avgHealth > 0.3) {
            sick++;
          } else {
            critical++;
          }

          if (needs.hunger < 0.3) {
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
      impl.updateComponent<HealthClinicComponent>(CT.HealthClinic, (current) => ({
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
