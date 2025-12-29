import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World';

/**
 * Integration tests for governance system.
 * Tests building progression, agent usage of information, and information degradation.
 */
describe('Governance System Integration', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Building Progression Path', () => {
    it('should follow recommended early game progression (Town Hall -> Granary -> Weather)', () => {
      // Early game: survival
      const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      expect(townHall).toBeDefined();

      const granary = world.buildWarehouse({
        wood: 80, stone: 30, builders: 2, resourceType: 'food'
      });
      expect(granary).toBeDefined();

      const weather = world.buildWeatherStation({
        x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2
      });
      expect(weather).toBeDefined();

      // Should be able to track population and resources
      expect(() => world.getPopulationStats()).not.toThrow();
      expect(() => world.getResourceTracking()).not.toThrow();
      expect(() => world.getWeatherForecast()).not.toThrow();
    });

    it('should enforce Census Bureau dependency on Town Hall', () => {
      expect(() => {
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
      }).toThrow('Census Bureau requires Town Hall');

      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });

      const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
      expect(bureau).toBeDefined();
    });

    it('should enforce Archive dependency on Census Bureau + Town Hall', () => {
      expect(() => {
        world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });
      }).toThrow('Archive requires Census Bureau and Town Hall');

      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });

      expect(() => {
        world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });
      }).toThrow('Archive requires Census Bureau');

      world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

      const archive = world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });
      expect(archive).toBeDefined();
    });
  });

  describe('Agent Decision-Making with Information', () => {
    describe('proactive vs reactive behavior', () => {
      it('should allow reactive behavior without Weather Station', () => {
        const agent = world.createAgent({ position: { x: 0, y: 0 } });
        world.setTemperature(30); // Cold
        agent.updateTemperature();

        // Reactive: only seeks shelter when already cold
        expect(agent.currentBehavior).toBe('seek_warmth');
      });

      it('should enable proactive behavior with Weather Station', () => {
        world.buildWeatherStation({
          x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2
        });

        const agent = world.createAgent({ position: { x: 0, y: 0 } });
        world.setFutureTemperature(3600, 30); // Will be cold in 1 hour

        agent.checkWeatherForecast();

        // Proactive: seeks shelter before getting cold
        expect(agent.plannedBehavior).toBe('seek_shelter');
      });
    });

    describe('resource planning', () => {
      it('should make agents desperate without Granary', () => {
        const agent = world.createAgent({ position: { x: 0, y: 0 }, hunger: 15 });

        // No warehouse = desperate individual action
        expect(agent.currentBehavior).toBe('find_food');
        expect(agent.canQueryResourceStatus()).toBe(false);
      });

      it('should enable community planning with Granary', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 50); // Only 2 days remaining
        warehouse.setConsumptionRate('berries', 10);

        const agent = world.createAgent({ position: { x: 0, y: 0 }, intelligence: 7 });

        const status = agent.queryWarehouse('food_sufficiency');

        // Smart agent sees shortage coming
        expect(status.daysRemaining).toBeLessThan(3);
        expect(agent.canAlertOthers()).toBe(true);
      });
    });

    describe('intelligence-based usage', () => {
      it('should have low intelligence agents rarely check buildings', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildWeatherStation({
          x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2
        });

        const agent = world.createAgent({ position: { x: 0, y: 0 }, intelligence: 2 });

        world.tick(3600); // 1 hour

        // Low intelligence = rarely queries buildings
        expect(agent.buildingQueryCount).toBeLessThan(2);
      });

      it('should have high intelligence agents regularly use buildings', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildWeatherStation({
          x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2
        });

        const agent = world.createAgent({ position: { x: 0, y: 0 }, intelligence: 9 });

        world.tick(3600); // 1 hour

        // High intelligence = regular queries
        expect(agent.buildingQueryCount).toBeGreaterThan(5);
      });

      it('should have smartest agents teach others', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        const smartAgent = world.createAgent({ position: { x: 0, y: 0 }, intelligence: 10 });
        const normalAgent = world.createAgent({ position: { x: 5, y: 5 }, intelligence: 5 });

        smartAgent.queryBuilding('census_bureau');
        smartAgent.shareKnowledge(normalAgent);

        expect(normalAgent.hasKnowledge('population_trend')).toBe(true);
      });
    });
  });

  describe('Staffed vs Unstaffed Buildings', () => {
    it('should provide real-time data when Census Bureau is staffed', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

      const staff = world.createAgent({ position: { x: 0, y: 0 } });
      bureau.assignStaff(staff);

      world.createAgent({ position: { x: 10, y: 10 } }); // New agent born

      // With staff: immediate update
      const data = bureau.getData();
      expect(data.updateFrequency).toBe('immediate');
      expect(data.population).toBe(2); // Includes new agent immediately
    });

    it('should provide delayed data when Census Bureau is unstaffed', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

      world.createAgent({ position: { x: 10, y: 10 } });

      // No staff: 24 hour update cycle
      const data = bureau.getData();
      expect(data.updateFrequency).toBe(24 * 3600);
      expect(data.lastUpdate).toBeLessThan(Date.now() - 24 * 3600 * 1000);
    });

    it('should have better accuracy with higher intelligence staff', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      const bureau1 = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
      const bureau2 = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

      const lowIntelStaff = world.createAgent({ position: { x: 0, y: 0 }, intelligence: 3 });
      const highIntelStaff = world.createAgent({ position: { x: 0, y: 0 }, intelligence: 9 });

      bureau1.assignStaff(lowIntelStaff);
      bureau2.assignStaff(highIntelStaff);

      const data1 = bureau1.getData();
      const data2 = bureau2.getData();

      expect(data2.accuracy).toBeGreaterThan(data1.accuracy);
    });
  });

  describe('Building State Effects on Data', () => {
    it('should degrade data quality when building is damaged', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      const warehouse = world.buildWarehouse({
        wood: 80, stone: 30, builders: 2, resourceType: 'food'
      });

      warehouse.deposit('berries', 100);

      // Full condition = full data
      warehouse.setCondition(100);
      let data = warehouse.getData();
      expect(data.latency).toBe(0);
      expect(data.accuracy).toBe(1.0);

      // Damaged = delayed + less accurate
      warehouse.setCondition(40);
      data = warehouse.getData();
      expect(data.latency).toBeGreaterThan(0);
      expect(data.accuracy).toBeLessThan(1.0);
    });

    it('should lose all data when building is destroyed', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      const warehouse = world.buildWarehouse({
        wood: 80, stone: 30, builders: 2, resourceType: 'food'
      });

      warehouse.deposit('berries', 100);

      warehouse.setCondition(0); // Destroyed

      expect(() => {
        warehouse.getData();
      }).toThrow('Warehouse destroyed');
    });

    it('should restore data when building is repaired', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      const warehouse = world.buildWarehouse({
        wood: 80, stone: 30, builders: 2, resourceType: 'food'
      });

      warehouse.setCondition(30); // Damaged
      warehouse.setCondition(100); // Repaired

      const data = warehouse.getData();
      expect(data.accuracy).toBe(1.0);
      expect(data.latency).toBe(0);
    });
  });

  describe('Information Degradation Without Buildings', () => {
    it('should have no visibility without any buildings', () => {
      const agent = world.createAgent({ position: { x: 0, y: 0 } });

      // Can't access any governance data
      expect(() => world.getPopulationStats()).toThrow();
      expect(() => world.getResourceTracking()).toThrow();
      expect(() => world.getWeatherForecast()).toThrow();
      expect(() => world.getHealthStats()).toThrow();

      expect(agent.canQueryBuildings()).toBe(false);
    });

    it('should operate reactively without information buildings', () => {
      const agent = world.createAgent({ position: { x: 0, y: 0 } });

      // Without Weather Station: can't prepare for weather
      world.setFutureTemperature(3600, 30);
      expect(agent.canPrepareForWeather()).toBe(false);

      // Without Granary: can't see resource shortage coming
      expect(agent.canPredictResourceShortage()).toBe(false);

      // Without Census: can't know population health
      expect(agent.canKnowPopulationTrend()).toBe(false);
    });

    it('should have higher mortality without Health Clinic', () => {
      const worldWithClinic = new World();
      worldWithClinic.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

      const worldWithoutClinic = new World();

      // Simulate 100 game-hours
      for (let i = 0; i < 10; i++) {
        worldWithClinic.createAgent({ position: { x: 0, y: 0 }, health: 50 });
        worldWithoutClinic.createAgent({ position: { x: 0, y: 0 }, health: 50 });
      }

      worldWithClinic.tick(100 * 3600);
      worldWithoutClinic.tick(100 * 3600);

      const deathsWithClinic = worldWithClinic.getDeathCount();
      const deathsWithoutClinic = worldWithoutClinic.getDeathCount();

      expect(deathsWithoutClinic).toBeGreaterThan(deathsWithClinic);
    });
  });

  describe('Player Dashboard Integration', () => {
    it('should lock panels when buildings do not exist', () => {
      const dashboard = world.getGovernanceDashboard();

      expect(dashboard.availablePanels.population).toBe(false);
      expect(dashboard.availablePanels.demographics).toBe(false);
      expect(dashboard.availablePanels.resources).toBe(false);
      expect(dashboard.availablePanels.weather).toBe(false);
      expect(dashboard.availablePanels.health).toBe(false);
      expect(dashboard.availablePanels.social).toBe(false);
      expect(dashboard.availablePanels.threats).toBe(false);
      expect(dashboard.availablePanels.workforce).toBe(false);
      expect(dashboard.availablePanels.historical).toBe(false);
    });

    it('should unlock panels as buildings are constructed', () => {
      const dashboard = world.getGovernanceDashboard();

      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      expect(dashboard.availablePanels.population).toBe(true);

      world.buildWarehouse({ wood: 80, stone: 30, builders: 2, resourceType: 'food' });
      expect(dashboard.availablePanels.resources).toBe(true);

      world.buildWeatherStation({ x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2 });
      expect(dashboard.availablePanels.weather).toBe(true);
    });

    it('should show building status for each panel', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      const townHall = world.getTownHall();

      const dashboard = world.getGovernanceDashboard();
      const popPanel = dashboard.dataQuality.find(d => d.panel === 'population');

      expect(popPanel?.source).toBe('Town Hall');
      expect(popPanel?.status).toBe('operational');

      townHall.setCondition(40);

      const updatedDashboard = world.getGovernanceDashboard();
      const updatedPanel = updatedDashboard.dataQuality.find(d => d.panel === 'population');

      expect(updatedPanel?.status).toBe('damaged');
      expect(updatedPanel?.accuracy).toBeLessThan(1.0);
    });

    it('should indicate when panel requires building construction', () => {
      const dashboard = world.getGovernanceDashboard();

      const demographicsPanel = dashboard.getPanelStatus('demographics');
      expect(demographicsPanel.available).toBe(false);
      expect(demographicsPanel.requiredBuildings).toContain('Census Bureau');
      expect(demographicsPanel.buildingCosts).toMatchObject({
        wood: 100,
        stone: 50,
        cloth: 20
      });
    });
  });

  describe('Strategic Trade-offs', () => {
    it('should force resource allocation decisions', () => {
      const resources = {
        wood: 200,
        stone: 100,
        cloth: 50,
        metal: 20
      };

      // Can build Census Bureau OR multiple shelters
      const censusCost = { wood: 100, stone: 50, cloth: 20 };
      const shelterCost = { wood: 40, stone: 20 };

      // Information vs survival
      const census = world.canBuildCensusBureau(resources);
      expect(census).toBe(false); // Requires Town Hall first

      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      resources.wood -= 50;
      resources.stone -= 20;

      const censusPossible = world.canBuildCensusBureau(resources);
      const sheltersPossible = Math.floor(
        Math.min(resources.wood / shelterCost.wood, resources.stone / shelterCost.stone)
      );

      expect(censusPossible).toBe(true);
      expect(sheltersPossible).toBe(3);

      // Must choose: information or shelter
    });

    it('should require staffing trade-offs', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
      const clinic = world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

      const agent1 = world.createAgent({ position: { x: 0, y: 0 } });
      const agent2 = world.createAgent({ position: { x: 0, y: 0 } });

      // Both buildings need staff
      expect(bureau.requiredStaff).toBe(1);
      expect(clinic.requiredStaff).toBe(1);

      // But only 2 agents
      bureau.assignStaff(agent1);
      clinic.assignStaff(agent2);

      // Now no agents available for gathering
      const availableGatherers = world.getAvailableAgents();
      expect(availableGatherers).toHaveLength(0);
    });
  });

  describe('Agent Autonomy and Emergent Behavior', () => {
    it('should allow agents to discover insights independently', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

      const smartAgent = world.createAgent({ position: { x: 0, y: 0 }, intelligence: 9 });

      // Create low replacement rate
      for (let i = 0; i < 5; i++) {
        const agent = world.createAgent({ position: { x: 0, y: 0 }, age: 70 });
        agent.die('old_age');
      }

      world.tick(3600);

      // Smart agent queries census and realizes problem
      smartAgent.analyzePopulationTrend();

      expect(smartAgent.hasInsight('extinction_risk')).toBe(true);
      expect(smartAgent.currentGoal).toBe('improve_survival_conditions');
    });

    it('should enable emergent leadership from Town Hall usage', () => {
      const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });

      const agent1 = world.createAgent({ position: { x: 0, y: 0 }, intelligence: 8 });
      const agent2 = world.createAgent({ position: { x: 0, y: 0 }, intelligence: 5 });
      const agent3 = world.createAgent({ position: { x: 0, y: 0 }, intelligence: 6 });

      world.tick(100 * 3600); // 100 hours

      // Agent who visits Town Hall most becomes de facto leader
      const leaderCandidate = world.getAgents().reduce((leader, agent) =>
        agent.townHallVisits > leader.townHallVisits ? agent : leader
      );

      expect(leaderCandidate.intelligence).toBeGreaterThanOrEqual(7);
      expect(leaderCandidate).toBe(agent1); // Smartest agent likely leader
    });

    it('should allow warehouse keeper role to emerge', () => {
      const warehouse = world.buildWarehouse({
        wood: 80, stone: 30, builders: 2, resourceType: 'food'
      });

      const agent = world.createAgent({ position: { x: 0, y: 0 } });

      // Agent frequently deposits/manages warehouse
      for (let i = 0; i < 20; i++) {
        agent.gatherResource('berries');
        agent.depositToWarehouse(warehouse, 'berries', 10);
      }

      world.tick(10 * 3600);

      // Agent becomes warehouse keeper
      expect(agent.rolePreference).toBe('warehouse_keeper');
      expect(warehouse.hasDedicatedKeeper()).toBe(true);
    });
  });

  describe('Error Handling Across System - No Fallbacks', () => {
    it('should throw when accessing panel without required buildings', () => {
      expect(() => world.getWelfarePanel()).toThrow();
      expect(() => world.getResourcePanel()).toThrow();
      expect(() => world.getSocialPanel()).toThrow();
      expect(() => world.getGenerationalPanel()).toThrow();
      expect(() => world.getThreatPanel()).toThrow();
    });

    it('should throw when agents query non-existent buildings', () => {
      const agent = world.createAgent({ position: { x: 0, y: 0 } });

      expect(() => agent.queryTownHall('population')).toThrow();
      expect(() => agent.queryCensusBureau('trend')).toThrow();
      expect(() => agent.queryWarehouse('food')).toThrow();
      expect(() => agent.queryWeatherStation('forecast')).toThrow();
    });

    it('should throw when calculating metrics with missing data', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

      // No agents = can't calculate demographics
      expect(() => {
        bureau.getData();
      }).toThrow('Cannot calculate demographics with no agents');
    });

    it('should throw when building operations invalid', () => {
      const warehouse = world.buildWarehouse({
        wood: 80, stone: 30, builders: 2, resourceType: 'food'
      });

      expect(() => {
        warehouse.withdraw('berries', 100);
      }).toThrow('Insufficient berries');

      expect(() => {
        warehouse.deposit('berries', 2000);
      }).toThrow('Warehouse capacity exceeded');
    });
  });
});
