import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';

/**
 * Tests for governance buildings that provide information infrastructure.
 * Per work order: Better infrastructure = better information.
 * Without buildings, agents and players operate with limited visibility.
 */
describe('Governance Buildings', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Town Hall (Basic Governance)', () => {
    describe('construction requirements', () => {
      it('should require 50 wood and 20 stone to construct', () => {
        const result = world.canBuildTownHall({ wood: 50, stone: 20 });
        expect(result).toBe(true);
      });

      it('should fail construction if insufficient resources', () => {
        expect(() => {
          world.buildTownHall({ wood: 30, stone: 10 });
        }).toThrow('Insufficient resources for Town Hall');
      });

      it('should require 2 builders', () => {
        expect(() => {
          world.buildTownHall({ wood: 50, stone: 20, builders: 1 });
        }).toThrow('Town Hall requires 2 builders');
      });

      it('should take 4 game-hours to construct', () => {
        const building = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        expect(building.constructionTime).toBe(4 * 3600); // 4 hours in seconds
      });
    });

    describe('population tracking', () => {
      it('should provide basic population count', () => {
        const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.createAgent({ position: { x: 0, y: 0 } });
        world.createAgent({ position: { x: 10, y: 10 } });

        const data = townHall.getData();
        expect(data.population).toBe(2);
      });

      it('should provide agent roster with id, name, age, generation', () => {
        const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const agent = world.createAgent({
          position: { x: 0, y: 0 },
          name: 'Alice',
          age: 25,
          generation: 1
        });

        const data = townHall.getData();
        expect(data.agents).toHaveLength(1);
        expect(data.agents[0]).toMatchObject({
          id: agent.id,
          name: 'Alice',
          age: 25,
          generation: 1,
          status: 'alive'
        });
      });

      it('should track death log with agent, cause, timestamp', () => {
        const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const agent = world.createAgent({ position: { x: 0, y: 0 }, name: 'Bob' });

        agent.die('starvation');

        const data = townHall.getData();
        expect(data.recentDeaths).toHaveLength(1);
        expect(data.recentDeaths[0]).toMatchObject({
          agent: 'Bob',
          cause: 'starvation'
        });
        expect(data.recentDeaths[0].timestamp).toBeGreaterThan(0);
      });

      it('should track birth log with agent, parents, timestamp', () => {
        const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const parent1 = world.createAgent({ position: { x: 0, y: 0 }, name: 'Alice' });
        const parent2 = world.createAgent({ position: { x: 0, y: 0 }, name: 'Bob' });

        const child = world.createAgent({
          position: { x: 0, y: 0 },
          name: 'Charlie',
          parents: [parent1.id, parent2.id]
        });

        const data = townHall.getData();
        expect(data.recentBirths).toHaveLength(1);
        expect(data.recentBirths[0]).toMatchObject({
          agent: 'Charlie',
          parents: ['Alice', 'Bob']
        });
      });
    });

    describe('agent interaction', () => {
      it('should allow agents to query "how many of us are there?"', () => {
        const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        const response = agent.queryTownHall('population_count');
        expect(response.population).toBe(1);
      });

      it('should allow agents to check if specific agents are alive', () => {
        const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const agent1 = world.createAgent({ position: { x: 0, y: 0 }, name: 'Alice' });
        const agent2 = world.createAgent({ position: { x: 0, y: 0 }, name: 'Bob' });

        const isAlive = agent1.queryTownHall('is_alive', { agentName: 'Bob' });
        expect(isAlive).toBe(true);
      });
    });

    describe('building state effects', () => {
      it('should provide full data when operational', () => {
        const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        townHall.setCondition(100);

        const data = townHall.getData();
        expect(data.dataQuality).toBe('full');
        expect(data.latency).toBe(0);
      });

      it('should delay data by 5 minutes when damaged', () => {
        const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        townHall.setCondition(50); // Damaged

        const data = townHall.getData();
        expect(data.dataQuality).toBe('delayed');
        expect(data.latency).toBe(300); // 5 minutes in seconds
      });

      it('should provide no data when destroyed', () => {
        const townHall = world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        townHall.setCondition(0); // Destroyed

        expect(() => {
          townHall.getData();
        }).toThrow('Town Hall destroyed - no population tracking available');
      });
    });

    describe('error handling - no fallbacks', () => {
      it('should throw if getData called on non-existent building', () => {
        expect(() => {
          world.getTownHallData();
        }).toThrow('No Town Hall built');
      });

      it('should throw if agent queries without Town Hall', () => {
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        expect(() => {
          agent.queryTownHall('population_count');
        }).toThrow('No Town Hall available for query');
      });
    });
  });

  describe('Census Bureau (Demographics)', () => {
    describe('construction requirements', () => {
      it('should require Town Hall to be built first', () => {
        expect(() => {
          world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20 });
        }).toThrow('Census Bureau requires Town Hall');
      });

      it('should require 100 wood, 50 stone, 20 cloth', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });

        const result = world.canBuildCensusBureau({ wood: 100, stone: 50, cloth: 20 });
        expect(result).toBe(true);
      });

      it('should require 3 builders and 8 hours construction time', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });

        expect(() => {
          world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 2 });
        }).toThrow('Census Bureau requires 3 builders');
      });

      it('should require staffing by 1 agent during work hours', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        expect(bureau.requiredStaff).toBe(1);
        expect(bureau.currentStaff).toHaveLength(0);
      });
    });

    describe('demographics tracking', () => {
      it('should provide age distribution (children, adults, elders)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        world.createAgent({ position: { x: 0, y: 0 }, age: 10 }); // child
        world.createAgent({ position: { x: 0, y: 0 }, age: 30 }); // adult
        world.createAgent({ position: { x: 0, y: 0 }, age: 65 }); // elder

        const data = bureau.getData();
        expect(data.demographics).toMatchObject({
          children: 1,
          adults: 1,
          elders: 1
        });
      });

      it('should calculate birth rate (births per game-day)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        // Simulate births over time
        world.createAgent({ position: { x: 0, y: 0 } });
        world.tick(12 * 3600); // 12 hours
        world.createAgent({ position: { x: 0, y: 0 } });
        world.tick(12 * 3600); // 12 more hours = 1 day

        const data = bureau.getData();
        expect(data.birthRate).toBe(2); // 2 births per day
      });

      it('should calculate death rate (deaths per game-day)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        const agent = world.createAgent({ position: { x: 0, y: 0 } });
        world.tick(12 * 3600);
        agent.die('old_age');
        world.tick(12 * 3600);

        const data = bureau.getData();
        expect(data.deathRate).toBe(1);
      });

      it('should calculate replacement rate', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        // 2 births, 1 death = 2.0 replacement rate
        const data = bureau.getData();
        expect(data.replacementRate).toBeCloseTo(2.0);
      });
    });

    describe('population projections', () => {
      it('should project population in 10 generations', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        const data = bureau.getData();
        expect(data.projections.in10Generations).toBeGreaterThan(0);
      });

      it('should calculate extinction risk based on replacement rate', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        // Low replacement rate = high extinction risk
        bureau.setReplacementRate(0.5);

        const data = bureau.getData();
        expect(data.projections.extinctionRisk).toBe('high');
      });
    });

    describe('staffing effects', () => {
      it('should provide real-time data when staffed', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        bureau.assignStaff(agent);

        const data = bureau.getData();
        expect(data.dataQuality).toBe('real_time');
        expect(data.updateFrequency).toBe('immediate');
      });

      it('should provide stale data when unstaffed (24hr updates)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        const data = bureau.getData();
        expect(data.dataQuality).toBe('stale');
        expect(data.updateFrequency).toBe(24 * 3600); // 24 hours
      });

      it('should have better accuracy with higher intelligence staff', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        const smartAgent = world.createAgent({
          position: { x: 0, y: 0 },
          intelligence: 9
        });

        bureau.assignStaff(smartAgent);

        const data = bureau.getData();
        expect(data.accuracy).toBeGreaterThan(0.95);
      });
    });

    describe('agent benefits', () => {
      it('should allow agents to ask "do we have enough children?"', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        const response = agent.queryCensusBureau('child_sufficiency');
        expect(response).toHaveProperty('sufficient');
        expect(response).toHaveProperty('childCount');
      });

      it('should allow agents to see if population is growing or shrinking', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        const response = agent.queryCensusBureau('population_trend');
        expect(response.trend).toMatch(/growing|stable|shrinking/);
      });
    });

    describe('error handling - no fallbacks', () => {
      it('should throw if required field missing from query', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        const bureau = world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        expect(() => {
          agent.queryCensusBureau(); // No query type
        }).toThrow('Query type required');
      });
    });
  });

  describe('Granary / Resource Warehouse', () => {
    describe('construction requirements', () => {
      it('should require 80 wood and 30 stone', () => {
        const result = world.canBuildWarehouse({ wood: 80, stone: 30 });
        expect(result).toBe(true);
      });

      it('should require 2 builders and 6 hours construction time', () => {
        const warehouse = world.buildWarehouse({
          wood: 80,
          stone: 30,
          builders: 2,
          resourceType: 'food'
        });

        expect(warehouse.constructionTime).toBe(6 * 3600);
      });

      it('should allow building multiple warehouses for different resources', () => {
        const foodWarehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });
        const woodWarehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'wood'
        });

        expect(world.getWarehouses()).toHaveLength(2);
      });

      it('should have capacity of 1000 units', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        expect(warehouse.capacity).toBe(1000);
      });
    });

    describe('resource tracking', () => {
      it('should track stockpile counts', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 50);
        warehouse.deposit('meat', 30);

        const data = warehouse.getData();
        expect(data.stockpiles).toMatchObject({
          berries: 50,
          meat: 30
        });
      });

      it('should calculate production rate (resources in per hour)', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 10);
        world.tick(1800); // 30 minutes
        warehouse.deposit('berries', 10);
        world.tick(1800); // 30 more minutes = 1 hour

        const data = warehouse.getData();
        expect(data.productionRates.berries).toBe(20); // 20 per hour
      });

      it('should calculate consumption rate (resources out per hour)', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 100);
        warehouse.withdraw('berries', 10);
        world.tick(1800);
        warehouse.withdraw('berries', 10);
        world.tick(1800);

        const data = warehouse.getData();
        expect(data.consumptionRates.berries).toBe(20);
      });

      it('should calculate days until depletion', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 100);
        warehouse.setConsumptionRate('berries', 10); // 10 per hour

        const data = warehouse.getData();
        // 100 units / 10 per hour = 10 hours = 0.417 days
        expect(data.daysRemaining.berries).toBeCloseTo(0.417, 2);
      });

      it('should track resource status (surplus, adequate, low, critical)', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 10);
        warehouse.setConsumptionRate('berries', 50); // High consumption

        const data = warehouse.getData();
        expect(data.status.berries).toBe('critical');
      });
    });

    describe('resource distribution tracking', () => {
      it('should track distribution fairness with Gini coefficient', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        const agent1 = world.createAgent({ position: { x: 0, y: 0 } });
        const agent2 = world.createAgent({ position: { x: 0, y: 0 } });

        warehouse.distribute('berries', agent1, 100);
        warehouse.distribute('berries', agent2, 10);

        const data = warehouse.getData();
        expect(data.distribution[0].giniCoefficient).toBeGreaterThan(0.5); // Unequal
        expect(data.distribution[0].fairness).toBe('unequal');
      });
    });

    describe('agent interaction', () => {
      it('should allow agents to check "do we have enough food?"', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        warehouse.deposit('berries', 100);

        const response = agent.queryWarehouse('food_sufficiency');
        expect(response).toHaveProperty('sufficient');
        expect(response).toHaveProperty('daysRemaining');
      });

      it('should allow agents to request resources from warehouse', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        warehouse.deposit('berries', 100);

        const received = agent.requestFromWarehouse('berries', 10);
        expect(received).toBe(10);
        expect(warehouse.getData().stockpiles.berries).toBe(90);
      });
    });

    describe('untracked resources', () => {
      it('should not track resources not stored in warehouse', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        const agent = world.createAgent({ position: { x: 0, y: 0 } });
        agent.inventory.add('berries', 50); // Agent has berries not in warehouse

        const data = warehouse.getData();
        expect(data.stockpiles.berries).toBeUndefined();
      });
    });

    describe('error handling - no fallbacks', () => {
      it('should throw if withdrawing more than available', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 10);

        expect(() => {
          warehouse.withdraw('berries', 20);
        }).toThrow('Insufficient berries in warehouse');
      });

      it('should throw if exceeding capacity', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        expect(() => {
          warehouse.deposit('berries', 1001);
        }).toThrow('Warehouse capacity exceeded');
      });
    });
  });

  describe('Weather Station', () => {
    describe('construction requirements', () => {
      it('should require 60 wood, 40 stone, 10 metal', () => {
        const result = world.canBuildWeatherStation({
          wood: 60,
          stone: 40,
          metal: 10
        });
        expect(result).toBe(true);
      });

      it('should require open area (not surrounded by buildings)', () => {
        const building1 = world.buildShelter({ x: 0, y: 0 });
        const building2 = world.buildShelter({ x: 10, y: 0 });
        const building3 = world.buildShelter({ x: 0, y: 10 });

        expect(() => {
          world.buildWeatherStation({
            x: 5,
            y: 5,
            wood: 60,
            stone: 40,
            metal: 10
          });
        }).toThrow('Weather Station requires open area');
      });

      it('should require 2 builders and 5 hours construction time', () => {
        const station = world.buildWeatherStation({
          x: 100,
          y: 100,
          wood: 60,
          stone: 40,
          metal: 10,
          builders: 2
        });

        expect(station.constructionTime).toBe(5 * 3600);
      });
    });

    describe('weather monitoring', () => {
      it('should provide current temperature', () => {
        const station = world.buildWeatherStation({
          x: 100, y: 100,
          wood: 60, stone: 40, metal: 10, builders: 2
        });

        const data = station.getData();
        expect(data.current.temperature).toBeGreaterThan(0);
      });

      it('should provide 24-hour forecast', () => {
        const station = world.buildWeatherStation({
          x: 100, y: 100,
          wood: 60, stone: 40, metal: 10, builders: 2
        });

        const data = station.getData();
        expect(data.forecast).toHaveLength(24);
        expect(data.forecast[0]).toHaveProperty('time');
        expect(data.forecast[0]).toHaveProperty('temperature');
        expect(data.forecast[0]).toHaveProperty('risk');
      });

      it('should provide extreme weather warnings', () => {
        const station = world.buildWeatherStation({
          x: 100, y: 100,
          wood: 60, stone: 40, metal: 10, builders: 2
        });

        world.setFutureTemperature(3600, 100); // Hot in 1 hour

        const data = station.getData();
        expect(data.warnings).toContainEqual(
          expect.objectContaining({
            type: 'heatwave',
            severity: expect.any(String),
            startsIn: expect.any(Number),
            duration: expect.any(Number)
          })
        );
      });

      it('should identify agents at risk of hypothermia/heatstroke', () => {
        const station = world.buildWeatherStation({
          x: 100, y: 100,
          wood: 60, stone: 40, metal: 10, builders: 2
        });

        const agent = world.createAgent({ position: { x: 50, y: 50 } });
        world.setTemperature(30); // Cold

        const data = station.getData();
        expect(data.agentsAtRisk).toContain(agent);
      });
    });

    describe('agent benefits', () => {
      it('should allow agents to check weather before going outside', () => {
        const station = world.buildWeatherStation({
          x: 100, y: 100,
          wood: 60, stone: 40, metal: 10, builders: 2
        });
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        const forecast = agent.queryWeatherStation('forecast', { hours: 6 });
        expect(forecast).toHaveProperty('minTemp');
        expect(forecast).toHaveProperty('maxTemp');
        expect(forecast).toHaveProperty('safe');
      });
    });

    describe('without Weather Station', () => {
      it('should throw when querying without station built', () => {
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        expect(() => {
          agent.queryWeatherStation('forecast');
        }).toThrow('No Weather Station available');
      });
    });

    describe('error handling - no fallbacks', () => {
      it('should throw if forecast hours not specified', () => {
        const station = world.buildWeatherStation({
          x: 100, y: 100,
          wood: 60, stone: 40, metal: 10, builders: 2
        });
        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        expect(() => {
          agent.queryWeatherStation('forecast', {}); // Missing hours
        }).toThrow('Forecast hours required');
      });
    });
  });

  describe('Health Clinic', () => {
    describe('construction requirements', () => {
      it('should require 100 wood, 50 stone, 30 cloth', () => {
        const result = world.canBuildHealthClinic({
          wood: 100,
          stone: 50,
          cloth: 30
        });
        expect(result).toBe(true);
      });

      it('should require 3 builders and 10 hours construction time', () => {
        const clinic = world.buildHealthClinic({
          wood: 100, stone: 50, cloth: 30, builders: 3
        });

        expect(clinic.constructionTime).toBe(10 * 3600);
      });

      it('should require staffing by 1+ healer agents', () => {
        const clinic = world.buildHealthClinic({
          wood: 100, stone: 50, cloth: 30, builders: 3
        });

        expect(clinic.requiredStaff).toBeGreaterThanOrEqual(1);
      });
    });

    describe('health tracking', () => {
      it('should provide population health statistics', () => {
        const clinic = world.buildHealthClinic({
          wood: 100, stone: 50, cloth: 30, builders: 3
        });

        world.createAgent({ position: { x: 0, y: 0 }, health: 100 });
        world.createAgent({ position: { x: 0, y: 0 }, health: 50 });
        world.createAgent({ position: { x: 0, y: 0 }, health: 10 });

        const data = clinic.getData();
        expect(data.populationHealth).toMatchObject({
          healthy: 1,
          sick: 1,
          critical: 1
        });
      });

      it('should track malnutrition rates', () => {
        const clinic = world.buildHealthClinic({
          wood: 100, stone: 50, cloth: 30, builders: 3
        });

        world.createAgent({ position: { x: 0, y: 0 }, hunger: 10 });
        world.createAgent({ position: { x: 0, y: 0 }, hunger: 80 });

        const data = clinic.getData();
        expect(data.malnutrition.affected).toBe(1);
        expect(data.malnutrition.trend).toMatch(/improving|stable|worsening/);
      });

      it('should analyze leading causes of death', () => {
        const clinic = world.buildHealthClinic({
          wood: 100, stone: 50, cloth: 30, builders: 3
        });

        const agent1 = world.createAgent({ position: { x: 0, y: 0 } });
        const agent2 = world.createAgent({ position: { x: 0, y: 0 } });

        agent1.die('starvation');
        agent2.die('starvation');

        const data = clinic.getData();
        expect(data.mortality).toContainEqual(
          expect.objectContaining({
            cause: 'starvation',
            count: 2,
            percentage: 100
          })
        );
      });
    });

    describe('treatment', () => {
      it('should allow agents to get treated (healing)', () => {
        const clinic = world.buildHealthClinic({
          wood: 100, stone: 50, cloth: 30, builders: 3
        });
        const healer = world.createAgent({ position: { x: 0, y: 0 } });
        clinic.assignStaff(healer);

        const patient = world.createAgent({ position: { x: 0, y: 0 }, health: 50 });
        patient.seekTreatment(clinic);

        world.tick(3600); // 1 hour treatment

        expect(patient.health).toBeGreaterThan(50);
      });

      it('should have better treatment with high intelligence healers', () => {
        const clinic = world.buildHealthClinic({
          wood: 100, stone: 50, cloth: 30, builders: 3
        });
        const smartHealer = world.createAgent({
          position: { x: 0, y: 0 },
          intelligence: 9
        });
        clinic.assignStaff(smartHealer);

        const patient = world.createAgent({ position: { x: 0, y: 0 }, health: 50 });
        const healingRate = patient.seekTreatment(clinic);

        expect(healingRate).toBeGreaterThan(1.0); // Bonus from smart healer
      });
    });

    describe('staffing effects', () => {
      it('should need 1 healer per 20 agents', () => {
        const clinic = world.buildHealthClinic({
          wood: 100, stone: 50, cloth: 30, builders: 3
        });

        for (let i = 0; i < 40; i++) {
          world.createAgent({ position: { x: 0, y: 0 } });
        }

        expect(clinic.recommendedStaff).toBe(2);
      });

      it('should provide only basic health info when unstaffed', () => {
        const clinic = world.buildHealthClinic({
          wood: 100, stone: 50, cloth: 30, builders: 3
        });

        const data = clinic.getData();
        expect(data.dataQuality).toBe('basic');
        expect(data.treatments).toBe(0);
      });
    });

    describe('error handling - no fallbacks', () => {
      it('should throw if seeking treatment at unstaffed clinic', () => {
        const clinic = world.buildHealthClinic({
          wood: 100, stone: 50, cloth: 30, builders: 3
        });
        const patient = world.createAgent({ position: { x: 0, y: 0 } });

        expect(() => {
          patient.seekTreatment(clinic);
        }).toThrow('Clinic has no healers available');
      });
    });
  });

  describe('Information Degradation Without Buildings', () => {
    it('should not provide population stats without Town Hall', () => {
      const agent = world.createAgent({ position: { x: 0, y: 0 } });

      expect(() => {
        world.getPopulationStats();
      }).toThrow('No Town Hall built');
    });

    it('should not predict extinction without Census Bureau', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });

      expect(() => {
        world.getExtinctionRisk();
      }).toThrow('No Census Bureau built');
    });

    it('should not track resources without Warehouse', () => {
      expect(() => {
        world.getResourceTracking();
      }).toThrow('No Warehouse built');
    });

    it('should not forecast weather without Weather Station', () => {
      expect(() => {
        world.getWeatherForecast();
      }).toThrow('No Weather Station built');
    });

    it('should not track health without Health Clinic', () => {
      expect(() => {
        world.getHealthStats();
      }).toThrow('No Health Clinic built');
    });
  });
});
