import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World';

/**
 * Tests for governance dashboard panels and data calculations.
 * These panels display data collected by governance buildings.
 * Per work order: If building doesn't exist, panel is locked.
 */
describe('Governance Dashboard', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Population Welfare Panel', () => {
    describe('requirements', () => {
      it('should require Town Hall + Health Clinic', () => {
        expect(() => {
          world.getWelfarePanel();
        }).toThrow('Welfare Panel requires Town Hall and Health Clinic');
      });

      it('should be available when both buildings exist', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        const panel = world.getWelfarePanel();
        expect(panel).toBeDefined();
      });
    });

    describe('critical alerts', () => {
      it('should identify agents with hunger < 10 as starving', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        const agent = world.createAgent({ position: { x: 0, y: 0 }, hunger: 5 });

        const panel = world.getWelfarePanel();
        expect(panel.criticalAlerts.starving).toContain(agent);
      });

      it('should identify agents with thirst < 10 as dehydrating', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        const agent = world.createAgent({ position: { x: 0, y: 0 }, thirst: 5 });

        const panel = world.getWelfarePanel();
        expect(panel.criticalAlerts.dehydrating).toContain(agent);
      });

      it('should identify agents with temp < 35 as freezing', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        const agent = world.createAgent({ position: { x: 0, y: 0 } });
        world.setTemperature(30);
        agent.updateTemperature();

        const panel = world.getWelfarePanel();
        expect(panel.criticalAlerts.freezing).toContain(agent);
      });

      it('should identify agents with temp > 100 as overheating', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        const agent = world.createAgent({ position: { x: 0, y: 0 } });
        world.setTemperature(105);
        agent.updateTemperature();

        const panel = world.getWelfarePanel();
        expect(panel.criticalAlerts.overheating).toContain(agent);
      });

      it('should identify agents with energy < 10 as exhausted', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        const agent = world.createAgent({ position: { x: 0, y: 0 }, energy: 5 });

        const panel = world.getWelfarePanel();
        expect(panel.criticalAlerts.exhausted).toContain(agent);
      });
    });

    describe('health summary', () => {
      it('should count healthy agents (all needs > 50)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        world.createAgent({
          position: { x: 0, y: 0 },
          hunger: 80,
          thirst: 80,
          energy: 80
        });

        const panel = world.getWelfarePanel();
        expect(panel.healthSummary.healthy).toBe(1);
      });

      it('should count struggling agents (any need 20-50)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        world.createAgent({
          position: { x: 0, y: 0 },
          hunger: 30,
          thirst: 80,
          energy: 80
        });

        const panel = world.getWelfarePanel();
        expect(panel.healthSummary.struggling).toBe(1);
      });

      it('should count critical agents (any need < 20)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        world.createAgent({
          position: { x: 0, y: 0 },
          hunger: 15,
          thirst: 80,
          energy: 80
        });

        const panel = world.getWelfarePanel();
        expect(panel.healthSummary.critical).toBe(1);
      });

      it('should count dying agents (any need < 10)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        world.createAgent({
          position: { x: 0, y: 0 },
          hunger: 5,
          thirst: 80,
          energy: 80
        });

        const panel = world.getWelfarePanel();
        expect(panel.healthSummary.dying).toBe(1);
      });
    });

    describe('needs gauges', () => {
      it('should calculate average hunger across population', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        world.createAgent({ position: { x: 0, y: 0 }, hunger: 60 });
        world.createAgent({ position: { x: 0, y: 0 }, hunger: 80 });

        const panel = world.getWelfarePanel();
        expect(panel.needsGauges.food.avg).toBe(70);
      });

      it('should count agents with hunger < 30 as below safe', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        world.createAgent({ position: { x: 0, y: 0 }, hunger: 20 });
        world.createAgent({ position: { x: 0, y: 0 }, hunger: 80 });

        const panel = world.getWelfarePanel();
        expect(panel.needsGauges.food.belowSafe).toBe(1);
      });

      it('should calculate trend (rising, stable, falling)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        const agent = world.createAgent({ position: { x: 0, y: 0 }, hunger: 50 });
        world.tick(3600);
        agent.setHunger(60);
        world.tick(3600);

        const panel = world.getWelfarePanel();
        expect(panel.needsGauges.food.trend).toBe('rising');
      });
    });

    describe('shelter tracking', () => {
      it('should count properly housed agents (safe temperature)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        const shelter = world.buildShelter({ x: 0, y: 0 });
        const agent = world.createAgent({ position: { x: 0, y: 0 } });
        agent.enterShelter(shelter);

        const panel = world.getWelfarePanel();
        expect(panel.needsGauges.shelter.properlyHoused).toBe(1);
      });

      it('should track shelter capacity and utilization', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildHealthClinic({ wood: 100, stone: 50, cloth: 30, builders: 3 });

        const shelter = world.buildShelter({ x: 0, y: 0, capacity: 5 });
        const agent1 = world.createAgent({ position: { x: 0, y: 0 } });
        const agent2 = world.createAgent({ position: { x: 0, y: 0 } });
        agent1.enterShelter(shelter);
        agent2.enterShelter(shelter);

        const panel = world.getWelfarePanel();
        expect(panel.needsGauges.shelter.shelterCapacity).toBe(5);
        expect(panel.needsGauges.shelter.utilization).toBe(40); // 2/5 = 40%
      });
    });

    describe('error handling - no fallbacks', () => {
      it('should throw if Health Clinic missing', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });

        expect(() => {
          world.getWelfarePanel();
        }).toThrow('Welfare Panel requires Town Hall and Health Clinic');
      });
    });
  });

  describe('Resource Sustainability Panel', () => {
    describe('requirements', () => {
      it('should require Granary/Warehouse', () => {
        expect(() => {
          world.getResourcePanel();
        }).toThrow('Resource Panel requires Warehouse');
      });
    });

    describe('stockpile tracking', () => {
      it('should show current amount for each resource', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 100);

        const panel = world.getResourcePanel();
        expect(panel.stockpiles.berries.amount).toBe(100);
      });

      it('should calculate days remaining at current consumption rate', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 100);
        warehouse.setConsumptionRate('berries', 10); // 10/hour

        const panel = world.getResourcePanel();
        // 100 / 10 = 10 hours = 0.417 days
        expect(panel.stockpiles.berries.daysRemaining).toBeCloseTo(0.417, 2);
      });

      it('should categorize status as surplus when > 7 days', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 1000);
        warehouse.setConsumptionRate('berries', 5);

        const panel = world.getResourcePanel();
        expect(panel.stockpiles.berries.status).toBe('surplus');
      });

      it('should categorize status as critical when < 1 day', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 10);
        warehouse.setConsumptionRate('berries', 20);

        const panel = world.getResourcePanel();
        expect(panel.stockpiles.berries.status).toBe('critical');
      });

      it('should detect trend based on production vs consumption', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 100);
        warehouse.setProductionRate('berries', 5);
        warehouse.setConsumptionRate('berries', 10);

        const panel = world.getResourcePanel();
        expect(panel.stockpiles.berries.trend).toBe('depleting');
      });
    });

    describe('resource balance', () => {
      it('should calculate production rate in units per hour', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 10);
        world.tick(1800); // 30 min
        warehouse.deposit('berries', 10);
        world.tick(1800); // 30 min

        const panel = world.getResourcePanel();
        expect(panel.resourceBalance.berries.productionRate).toBe(20);
      });

      it('should calculate consumption rate in units per hour', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 100);
        warehouse.withdraw('berries', 5);
        world.tick(1800);
        warehouse.withdraw('berries', 5);
        world.tick(1800);

        const panel = world.getResourcePanel();
        expect(panel.resourceBalance.berries.consumptionRate).toBe(10);
      });

      it('should calculate net rate (production - consumption)', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.setProductionRate('berries', 15);
        warehouse.setConsumptionRate('berries', 10);

        const panel = world.getResourcePanel();
        expect(panel.resourceBalance.berries.netRate).toBe(5);
      });

      it('should flag deficit when consumption > production', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.setProductionRate('berries', 5);
        warehouse.setConsumptionRate('berries', 10);

        const panel = world.getResourcePanel();
        expect(panel.resourceBalance.berries.deficit).toBe(true);
      });
    });

    describe('buffer health', () => {
      it('should calculate shortfall when below 7-day target', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 50); // Only 5 days at 10/day consumption
        warehouse.setConsumptionRate('berries', 10);

        const panel = world.getResourcePanel();
        expect(panel.bufferHealth.food.target).toBe(7);
        expect(panel.bufferHealth.food.actual).toBeCloseTo(0.208, 2); // 50/10 hours / 24
        expect(panel.bufferHealth.food.shortfall).toBeGreaterThan(0);
      });
    });

    describe('efficiency metrics', () => {
      it('should count active gatherers', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        const agent = world.createAgent({ position: { x: 0, y: 0 } });
        agent.setBehavior('gather');

        const panel = world.getResourcePanel();
        expect(panel.efficiency.gatherersActive).toBe(1);
      });

      it('should count idle gatherers', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        const agent = world.createAgent({ position: { x: 0, y: 0 }, job: 'gatherer' });
        agent.setBehavior('wander'); // Has gather job but not gathering

        const panel = world.getResourcePanel();
        expect(panel.efficiency.gatherersIdle).toBe(1);
      });
    });

    describe('error handling - no fallbacks', () => {
      it('should throw if daysRemaining calculation has zero consumption', () => {
        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 100);
        warehouse.setConsumptionRate('berries', 0);

        const panel = world.getResourcePanel();
        // Should return Infinity, not crash or default
        expect(panel.stockpiles.berries.daysRemaining).toBe(Infinity);
      });
    });
  });

  describe('Social Stability Panel', () => {
    describe('requirements', () => {
      it('should require Meeting Hall', () => {
        expect(() => {
          world.getSocialPanel();
        }).toThrow('Social Panel requires Meeting Hall');
      });
    });

    describe('cohesion tracking', () => {
      it('should calculate cohesion score (0-100)', () => {
        const meetingHall = world.buildMeetingHall({
          wood: 120, stone: 60, builders: 3
        });

        const agent1 = world.createAgent({ position: { x: 0, y: 0 } });
        const agent2 = world.createAgent({ position: { x: 0, y: 0 } });
        agent1.addRelationship(agent2, 50);

        const panel = world.getSocialPanel();
        expect(panel.cohesion.score).toBeGreaterThanOrEqual(0);
        expect(panel.cohesion.score).toBeLessThanOrEqual(100);
      });

      it('should identify isolated agents (no relationships)', () => {
        const meetingHall = world.buildMeetingHall({
          wood: 120, stone: 60, builders: 3
        });

        const agent = world.createAgent({ position: { x: 0, y: 0 } });

        const panel = world.getSocialPanel();
        expect(panel.cohesion.isolatedAgents).toContain(agent);
      });

      it('should calculate average relationships per agent', () => {
        const meetingHall = world.buildMeetingHall({
          wood: 120, stone: 60, builders: 3
        });

        const agent1 = world.createAgent({ position: { x: 0, y: 0 } });
        const agent2 = world.createAgent({ position: { x: 0, y: 0 } });
        const agent3 = world.createAgent({ position: { x: 0, y: 0 } });

        agent1.addRelationship(agent2, 50);
        agent1.addRelationship(agent3, 50);
        agent2.addRelationship(agent3, 50);

        const panel = world.getSocialPanel();
        // 6 total relationships / 3 agents = 2 avg
        expect(panel.cohesion.avgRelationships).toBe(2);
      });
    });

    describe('inequality tracking', () => {
      it('should calculate Gini coefficient for wealth inequality', () => {
        const meetingHall = world.buildMeetingHall({
          wood: 120, stone: 60, builders: 3
        });

        const agent1 = world.createAgent({ position: { x: 0, y: 0 } });
        const agent2 = world.createAgent({ position: { x: 0, y: 0 } });

        agent1.inventory.add('berries', 100);
        agent2.inventory.add('berries', 10);

        const panel = world.getSocialPanel();
        expect(panel.inequality.giniCoefficient).toBeGreaterThan(0);
        expect(panel.inequality.giniCoefficient).toBeLessThanOrEqual(1);
      });

      it('should flag as equal when Gini < 0.2', () => {
        const meetingHall = world.buildMeetingHall({
          wood: 120, stone: 60, builders: 3
        });

        const agent1 = world.createAgent({ position: { x: 0, y: 0 } });
        const agent2 = world.createAgent({ position: { x: 0, y: 0 } });

        agent1.inventory.add('berries', 50);
        agent2.inventory.add('berries', 50);

        const panel = world.getSocialPanel();
        expect(panel.inequality.giniCoefficient).toBeLessThan(0.2);
      });
    });

    describe('morale tracking', () => {
      it('should calculate average happiness (0-100)', () => {
        const meetingHall = world.buildMeetingHall({
          wood: 120, stone: 60, builders: 3
        });

        world.createAgent({ position: { x: 0, y: 0 }, happiness: 80 });
        world.createAgent({ position: { x: 0, y: 0 }, happiness: 60 });

        const panel = world.getSocialPanel();
        expect(panel.morale.avgHappiness).toBe(70);
      });

      it('should categorize morale distribution', () => {
        const meetingHall = world.buildMeetingHall({
          wood: 120, stone: 60, builders: 3
        });

        world.createAgent({ position: { x: 0, y: 0 }, happiness: 80 }); // thriving
        world.createAgent({ position: { x: 0, y: 0 }, happiness: 50 }); // content
        world.createAgent({ position: { x: 0, y: 0 }, happiness: 30 }); // struggling
        world.createAgent({ position: { x: 0, y: 0 }, happiness: 10 }); // miserable

        const panel = world.getSocialPanel();
        expect(panel.morale.distribution.thriving).toBe(1);
        expect(panel.morale.distribution.content).toBe(1);
        expect(panel.morale.distribution.struggling).toBe(1);
        expect(panel.morale.distribution.miserable).toBe(1);
      });
    });

    describe('error handling - no fallbacks', () => {
      it('should throw when calculating Gini with no agents', () => {
        const meetingHall = world.buildMeetingHall({
          wood: 120, stone: 60, builders: 3
        });

        expect(() => {
          world.getSocialPanel();
        }).toThrow('Cannot calculate social metrics with no agents');
      });
    });
  });

  describe('Generational Health Panel', () => {
    describe('requirements', () => {
      it('should require Census Bureau + Archive', () => {
        expect(() => {
          world.getGenerationalPanel();
        }).toThrow('Generational Panel requires Census Bureau and Archive');
      });
    });

    describe('demographics', () => {
      it('should categorize by age (children 0-18, adults 18-60, elders 60+)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });

        world.createAgent({ position: { x: 0, y: 0 }, age: 10 });
        world.createAgent({ position: { x: 0, y: 0 }, age: 30 });
        world.createAgent({ position: { x: 0, y: 0 }, age: 65 });

        const panel = world.getGenerationalPanel();
        expect(panel.demographics.ageDistribution).toMatchObject({
          children: 1,
          adults: 1,
          elders: 1
        });
      });

      it('should calculate growth rate (birth rate - death rate)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });

        // Birth rate 2, death rate 1 = growth rate 1
        const panel = world.getGenerationalPanel();
        expect(panel.demographics.growthRate).toBeDefined();
      });
    });

    describe('sustainability metrics', () => {
      it('should calculate replacement rate (births per death)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });

        const panel = world.getGenerationalPanel();
        expect(panel.sustainability.replacementRate).toBeGreaterThan(0);
      });

      it('should flag high extinction risk when replacement < 1.0', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        const archive = world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });

        archive.setReplacementRate(0.5);

        const panel = world.getGenerationalPanel();
        expect(panel.sustainability.extinctionRisk).toMatch(/moderate|high/);
      });

      it('should project population in future generations', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });

        const panel = world.getGenerationalPanel();
        expect(panel.sustainability.projectedPopulation.in10Generations).toBeGreaterThan(0);
        expect(panel.sustainability.projectedPopulation.in50Generations).toBeGreaterThan(0);
      });
    });

    describe('epigenetic tracking', () => {
      it('should calculate average parental quality (0-100)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });

        const parent = world.createAgent({
          position: { x: 0, y: 0 },
          hunger: 80,
          thirst: 80,
          health: 90
        });

        const panel = world.getGenerationalPanel();
        expect(panel.epigenetics.avgParentalQuality).toBeGreaterThan(0);
        expect(panel.epigenetics.avgParentalQuality).toBeLessThanOrEqual(100);
      });

      it('should predict next generation intelligence based on parental quality', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });

        const parent = world.createAgent({
          position: { x: 0, y: 0 },
          intelligence: 8,
          hunger: 90,
          thirst: 90
        });

        const panel = world.getGenerationalPanel();
        expect(panel.epigenetics.nextGenProjection.intelligence).toBeGreaterThan(0);
      });
    });

    describe('survival analysis', () => {
      it('should calculate infant mortality rate (% deaths before age 5)', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });

        const child = world.createAgent({ position: { x: 0, y: 0 }, age: 3 });
        child.die('starvation');

        const panel = world.getGenerationalPanel();
        expect(panel.survivalMetrics.infantMortality).toBeGreaterThan(0);
      });

      it('should track leading causes of death with percentages', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });
        world.buildArchive({ wood: 150, stone: 80, cloth: 50, ink: 20, builders: 4 });

        const agent1 = world.createAgent({ position: { x: 0, y: 0 } });
        const agent2 = world.createAgent({ position: { x: 0, y: 0 } });
        const agent3 = world.createAgent({ position: { x: 0, y: 0 } });

        agent1.die('starvation');
        agent2.die('starvation');
        agent3.die('cold');

        const panel = world.getGenerationalPanel();
        expect(panel.survivalMetrics.leadingCausesOfDeath).toContainEqual(
          expect.objectContaining({
            cause: 'starvation',
            percentage: expect.closeTo(66.67, 1)
          })
        );
      });
    });

    describe('error handling - no fallbacks', () => {
      it('should throw if Archive not built', () => {
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        expect(() => {
          world.getGenerationalPanel();
        }).toThrow('Generational Panel requires Census Bureau and Archive');
      });
    });
  });

  describe('Threat Monitoring Panel', () => {
    describe('requirements', () => {
      it('should require Watchtower + Weather Station', () => {
        expect(() => {
          world.getThreatPanel();
        }).toThrow('Threat Panel requires Watchtower and Weather Station');
      });
    });

    describe('threat detection', () => {
      it('should detect extreme temperature as environmental threat', () => {
        world.buildWatchtower({ wood: 80, stone: 60, builders: 2 });
        world.buildWeatherStation({ x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2 });

        world.setTemperature(30); // Cold

        const panel = world.getThreatPanel();
        expect(panel.activeThreats).toContainEqual(
          expect.objectContaining({
            type: 'environmental',
            severity: expect.any(String)
          })
        );
      });

      it('should detect resource depletion threats', () => {
        world.buildWatchtower({ wood: 80, stone: 60, builders: 2 });
        world.buildWeatherStation({ x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2 });

        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 10);
        warehouse.setConsumptionRate('berries', 20); // Will run out in 0.5 hours

        const panel = world.getThreatPanel();
        expect(panel.activeThreats).toContainEqual(
          expect.objectContaining({
            type: 'resource',
            severity: 'critical'
          })
        );
      });

      it('should detect malnutrition crisis as health threat', () => {
        world.buildWatchtower({ wood: 80, stone: 60, builders: 2 });
        world.buildWeatherStation({ x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2 });

        // 30% of population malnourished
        world.createAgent({ position: { x: 0, y: 0 }, hunger: 10 });
        world.createAgent({ position: { x: 0, y: 0 }, hunger: 10 });
        world.createAgent({ position: { x: 0, y: 0 }, hunger: 10 });
        world.createAgent({ position: { x: 0, y: 0 }, hunger: 80 });

        const panel = world.getThreatPanel();
        expect(panel.activeThreats).toContainEqual(
          expect.objectContaining({
            type: 'health',
            description: expect.stringContaining('malnourished')
          })
        );
      });

      it('should sort threats by severity (critical > high > moderate > low)', () => {
        world.buildWatchtower({ wood: 80, stone: 60, builders: 2 });
        world.buildWeatherStation({ x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2 });

        // Create multiple threats
        world.setTemperature(105); // Critical
        const agent = world.createAgent({ position: { x: 0, y: 0 }, hunger: 30 }); // Low

        const panel = world.getThreatPanel();
        expect(panel.activeThreats[0].severity).toBe('critical');
      });
    });

    describe('predictions', () => {
      it('should predict population collapse when replacement < 1.0', () => {
        world.buildWatchtower({ wood: 80, stone: 60, builders: 2 });
        world.buildWeatherStation({ x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2 });
        world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
        world.buildCensusBureau({ wood: 100, stone: 50, cloth: 20, builders: 3 });

        // Set low replacement rate
        const bureau = world.getCensusBureau();
        bureau.setReplacementRate(0.7);

        const panel = world.getThreatPanel();
        expect(panel.predictions).toContainEqual(
          expect.objectContaining({
            event: expect.stringContaining('extinction'),
            preventable: true
          })
        );
      });

      it('should predict resource shortages based on trends', () => {
        world.buildWatchtower({ wood: 80, stone: 60, builders: 2 });
        world.buildWeatherStation({ x: 100, y: 100, wood: 60, stone: 40, metal: 10, builders: 2 });

        const warehouse = world.buildWarehouse({
          wood: 80, stone: 30, builders: 2, resourceType: 'food'
        });

        warehouse.deposit('berries', 100);
        warehouse.setConsumptionRate('berries', 20);
        warehouse.setProductionRate('berries', 10);

        const panel = world.getThreatPanel();
        expect(panel.predictions).toContainEqual(
          expect.objectContaining({
            event: expect.stringContaining('shortage'),
            timeframe: expect.any(String)
          })
        );
      });
    });

    describe('error handling - no fallbacks', () => {
      it('should throw if Weather Station missing', () => {
        world.buildWatchtower({ wood: 80, stone: 60, builders: 2 });

        expect(() => {
          world.getThreatPanel();
        }).toThrow('Threat Panel requires Watchtower and Weather Station');
      });
    });
  });

  describe('Dashboard Panel Availability', () => {
    it('should show which panels are available based on buildings', () => {
      const dashboard = world.getGovernanceDashboard();

      expect(dashboard.availablePanels.population).toBe(false);
      expect(dashboard.availablePanels.demographics).toBe(false);
      expect(dashboard.availablePanels.resources).toBe(false);

      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });

      const updated = world.getGovernanceDashboard();
      expect(updated.availablePanels.population).toBe(true);
    });

    it('should track data quality for each panel', () => {
      world.buildTownHall({ wood: 50, stone: 20, builders: 2 });
      const townHall = world.getTownHall();
      townHall.setCondition(50); // Damaged

      const dashboard = world.getGovernanceDashboard();
      const popData = dashboard.dataQuality.find(d => d.panel === 'population');

      expect(popData).toBeDefined();
      expect(popData?.accuracy).toBeLessThan(1.0);
      expect(popData?.latency).toBeGreaterThan(0);
    });

    describe('error handling - no fallbacks', () => {
      it('should throw if accessing panel data without building', () => {
        expect(() => {
          world.getWelfarePanel();
        }).toThrow();

        expect(() => {
          world.getResourcePanel();
        }).toThrow();

        expect(() => {
          world.getSocialPanel();
        }).toThrow();
      });
    });
  });
});
