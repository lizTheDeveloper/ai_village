import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { GovernanceDataSystem } from '../GovernanceDataSystem.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { createNeedsComponent } from '../../components/NeedsComponent.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';
import { createBuildingComponent } from '../../components/BuildingComponent.js';
import { createTownHallComponent } from '../../components/TownHallComponent.js';
import { createCensusBureauComponent } from '../../components/CensusBureauComponent.js';
import { createHealthClinicComponent } from '../../components/HealthClinicComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import type { TownHallComponent } from '../../components/TownHallComponent.js';
import type { CensusBureauComponent } from '../../components/CensusBureauComponent.js';
import type { HealthClinicComponent } from '../../components/HealthClinicComponent.js';

/**
 * Integration tests for GovernanceDataSystem
 *
 * Tests verify that:
 * - System actually runs and updates governance buildings
 * - TownHall is populated with agent data
 * - CensusBureau calculates demographics and projections
 * - HealthClinic tracks population health
 * - Death events are tracked correctly
 * - Data quality reflects building condition
 * - System handles missing components gracefully
 */

describe('GovernanceDataSystem Integration', () => {
  let harness: IntegrationTestHarness;
  let governanceSystem: GovernanceDataSystem;

  beforeEach(() => {
    harness = createMinimalWorld();
    governanceSystem = new GovernanceDataSystem();
    governanceSystem.initialize(harness.world, harness.eventBus);
    harness.registerSystem('GovernanceDataSystem', governanceSystem);
  });

  describe('Initialization', () => {
    it('should initialize with world and eventBus', () => {
      expect(governanceSystem).toBeDefined();
    });

    it('should subscribe to death events', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));

      harness.eventBus.emit({
        type: 'agent:starved',
        data: {
          agentId: agent.id,
        },
      });

      // Death should be recorded (tested more thoroughly below)
      expect(governanceSystem).toBeDefined();
    });
  });

  describe('TownHall Updates', () => {
    it('should update TownHall with population count', () => {
      const townHall = harness.createTestBuilding('town_hall', { x: 50, y: 50 });
      townHall.addComponent(createTownHallComponent());

      const agent1 = harness.createTestAgent({ x: 10, y: 10 });
      agent1.addComponent(createIdentityComponent('Agent1'));

      const agent2 = harness.createTestAgent({ x: 20, y: 20 });
      agent2.addComponent(createIdentityComponent('Agent2'));

      // Run system
      governanceSystem.update(harness.world, [], 0);

      const townHallComponent = townHall.getComponent<TownHallComponent>('town_hall');
      expect(townHallComponent?.populationCount).toBe(2);
    });

    it('should populate TownHall with agent records', () => {
      const townHall = harness.createTestBuilding('town_hall', { x: 50, y: 50 });
      townHall.addComponent(createTownHallComponent());

      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));

      governanceSystem.update(harness.world, [], 0);

      const townHallComponent = townHall.getComponent<TownHallComponent>('town_hall');
      expect(townHallComponent?.agents.length).toBe(1);
      expect(townHallComponent?.agents[0].name).toBe('TestAgent');
      expect(townHallComponent?.agents[0].status).toBe('alive');
    });

    it('should set data quality based on building condition', () => {
      const townHall = harness.createTestBuilding('town_hall', { x: 50, y: 50 });
      townHall.addComponent(createTownHallComponent());

      // Update building condition to 100
      townHall.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        condition: 100,
      }));

      governanceSystem.update(harness.world, [], 0);

      const townHallComponent = townHall.getComponent<TownHallComponent>('town_hall');
      expect(townHallComponent?.dataQuality).toBe('full');
      expect(townHallComponent?.latency).toBe(0);
    });

    it('should degrade data quality when building is damaged', () => {
      const townHall = harness.createTestBuilding('town_hall', { x: 50, y: 50 });
      townHall.addComponent(createTownHallComponent());

      // Damage building
      townHall.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        condition: 60,
      }));

      governanceSystem.update(harness.world, [], 0);

      const townHallComponent = townHall.getComponent<TownHallComponent>('town_hall');
      expect(townHallComponent?.dataQuality).toBe('delayed');
      expect(townHallComponent?.latency).toBe(300); // 5 minutes
    });

    it('should mark data unavailable when building is severely damaged', () => {
      const townHall = harness.createTestBuilding('town_hall', { x: 50, y: 50 });
      townHall.addComponent(createTownHallComponent());

      // Severely damage building
      townHall.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        condition: 30,
      }));

      governanceSystem.update(harness.world, [], 0);

      const townHallComponent = townHall.getComponent<TownHallComponent>('town_hall');
      expect(townHallComponent?.dataQuality).toBe('unavailable');
      expect(townHallComponent?.latency).toBe(Infinity);
    });
  });

  describe('Death Tracking', () => {
    it('should record agent deaths', () => {
      const townHall = harness.createTestBuilding('town_hall', { x: 50, y: 50 });
      townHall.addComponent(createTownHallComponent());

      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('DoomedAgent'));

      harness.eventBus.emitImmediate({
        type: 'agent:starved',
        data: {
          agentId: agent.id,
        },
      });

      governanceSystem.update(harness.world, [], 0);

      const townHallComponent = townHall.getComponent<TownHallComponent>('town_hall');
      expect(townHallComponent?.recentDeaths.length).toBeGreaterThan(0);
      expect(townHallComponent?.recentDeaths[0].cause).toBe('starvation');
    });

    it('should track different causes of death', () => {
      const townHall = harness.createTestBuilding('town_hall', { x: 50, y: 50 });
      townHall.addComponent(createTownHallComponent());

      const agent1 = harness.createTestAgent({ x: 10, y: 10 });
      agent1.addComponent(createIdentityComponent('Agent1'));

      const agent2 = harness.createTestAgent({ x: 20, y: 20 });
      agent2.addComponent(createIdentityComponent('Agent2'));

      harness.eventBus.emitImmediate({
        type: 'agent:starved',
        data: { agentId: agent1.id },
      });

      harness.eventBus.emitImmediate({
        type: 'agent:collapsed',
        data: { agentId: agent2.id, reason: 'exhaustion' },
      });

      governanceSystem.update(harness.world, [], 0);

      const townHallComponent = townHall.getComponent<TownHallComponent>('town_hall');
      expect(townHallComponent?.recentDeaths.length).toBe(2);
    });
  });

  describe('CensusBureau Updates', () => {
    it('should calculate demographics', () => {
      const bureau = harness.createTestBuilding('census_bureau', { x: 50, y: 50 });
      bureau.addComponent(createCensusBureauComponent());

      const agent1 = harness.createTestAgent({ x: 10, y: 10 });
      agent1.addComponent(createIdentityComponent('Agent1'));

      const agent2 = harness.createTestAgent({ x: 20, y: 20 });
      agent2.addComponent(createIdentityComponent('Agent2'));

      governanceSystem.update(harness.world, [], 0);

      const bureauComponent = bureau.getComponent<CensusBureauComponent>('census_bureau');
      expect(bureauComponent?.demographics).toBeDefined();
      expect(bureauComponent?.demographics.adults).toBe(2); // All agents are adults by default
    });

    it('should calculate birth and death rates', () => {
      const bureau = harness.createTestBuilding('census_bureau', { x: 50, y: 50 });
      bureau.addComponent(createCensusBureauComponent());

      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));

      // Emit death event
      harness.eventBus.emitImmediate({
        type: 'agent:starved',
        data: { agentId: agent.id },
      });

      governanceSystem.update(harness.world, [], 0);

      const bureauComponent = bureau.getComponent<CensusBureauComponent>('census_bureau');
      expect(bureauComponent?.deathRate).toBeGreaterThanOrEqual(0);
      expect(bureauComponent?.birthRate).toBeGreaterThanOrEqual(0);
    });

    it('should calculate extinction risk', () => {
      const bureau = harness.createTestBuilding('census_bureau', { x: 50, y: 50 });
      bureau.addComponent(createCensusBureauComponent());

      // Create very small population
      for (let i = 0; i < 3; i++) {
        const agent = harness.createTestAgent({ x: 10 + i, y: 10 });
        agent.addComponent(createIdentityComponent(`Agent${i}`));
      }

      governanceSystem.update(harness.world, [], 0);

      const bureauComponent = bureau.getComponent<CensusBureauComponent>('census_bureau');
      expect(bureauComponent?.projections.extinctionRisk).toBe('high'); // < 10 agents
    });

    it('should improve data quality when staffed', () => {
      const bureau = harness.createTestBuilding('census_bureau', { x: 50, y: 50 });
      bureau.addComponent(createCensusBureauComponent());

      // Add staff to building
      bureau.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        currentStaff: ['staff-agent-1'],
      }));

      governanceSystem.update(harness.world, [], 0);

      const bureauComponent = bureau.getComponent<CensusBureauComponent>('census_bureau');
      expect(bureauComponent?.dataQuality).toBe('real_time');
      expect(bureauComponent?.accuracy).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('HealthClinic Updates', () => {
    it('should track population health', () => {
      const clinic = harness.createTestBuilding('health_clinic', { x: 50, y: 50 });
      clinic.addComponent(createHealthClinicComponent());

      const healthyAgent = harness.createTestAgent({ x: 10, y: 10 });
      healthyAgent.addComponent(createAgentComponent('healthy', 'wander'));
      healthyAgent.addComponent(createNeedsComponent(90, 90, 90, 90, 90));

      const sickAgent = harness.createTestAgent({ x: 20, y: 20 });
      sickAgent.addComponent(createAgentComponent('sick', 'wander'));
      sickAgent.addComponent(createNeedsComponent(40, 40, 40, 40, 40));

      governanceSystem.update(harness.world, [], 0);

      const clinicComponent = clinic.getComponent<HealthClinicComponent>('health_clinic');
      expect(clinicComponent?.populationHealth.healthy).toBeGreaterThan(0);
      expect(clinicComponent?.populationHealth.sick).toBeGreaterThan(0);
    });

    it('should identify critical health cases', () => {
      const clinic = harness.createTestBuilding('health_clinic', { x: 50, y: 50 });
      clinic.addComponent(createHealthClinicComponent());

      const criticalAgent = harness.createTestAgent({ x: 10, y: 10 });
      criticalAgent.addComponent(createAgentComponent('critical', 'wander'));
      criticalAgent.addComponent(createNeedsComponent(10, 10, 10, 10, 10));

      governanceSystem.update(harness.world, [], 0);

      const clinicComponent = clinic.getComponent<HealthClinicComponent>('health_clinic');
      expect(clinicComponent?.populationHealth.critical).toBeGreaterThan(0);
    });

    it('should track malnutrition', () => {
      const clinic = harness.createTestBuilding('health_clinic', { x: 50, y: 50 });
      clinic.addComponent(createHealthClinicComponent());

      const malnourishedAgent = harness.createTestAgent({ x: 10, y: 10 });
      malnourishedAgent.addComponent(createAgentComponent('malnourished', 'wander'));
      malnourishedAgent.addComponent(createNeedsComponent(20, 50, 50, 50, 50)); // Low hunger

      governanceSystem.update(harness.world, [], 0);

      const clinicComponent = clinic.getComponent<HealthClinicComponent>('health_clinic');
      expect(clinicComponent?.malnutrition.affected).toBeGreaterThan(0);
    });

    it('should calculate mortality causes', () => {
      const clinic = harness.createTestBuilding('health_clinic', { x: 50, y: 50 });
      clinic.addComponent(createHealthClinicComponent());

      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));

      // Emit death events
      harness.eventBus.emitImmediate({
        type: 'agent:starved',
        data: { agentId: agent.id },
      });

      governanceSystem.update(harness.world, [], 0);

      const clinicComponent = clinic.getComponent<HealthClinicComponent>('health_clinic');
      expect(clinicComponent?.mortality.length).toBeGreaterThan(0);
    });

    it('should recommend staff based on population', () => {
      const clinic = harness.createTestBuilding('health_clinic', { x: 50, y: 50 });
      clinic.addComponent(createHealthClinicComponent());

      // Create 25 agents (should recommend 2 staff: 1 per 20)
      for (let i = 0; i < 25; i++) {
        const agent = harness.createTestAgent({ x: 10 + i, y: 10 });
        agent.addComponent(createAgentComponent(`agent-${i}`, 'wander'));
        agent.addComponent(createNeedsComponent(80, 80, 80, 80, 80));
      }

      governanceSystem.update(harness.world, [], 0);

      const clinicComponent = clinic.getComponent<HealthClinicComponent>('health_clinic');
      expect(clinicComponent?.recommendedStaff).toBe(2); // ceil(25/20) = 2
    });

    it('should improve data quality when staffed', () => {
      const clinic = harness.createTestBuilding('health_clinic', { x: 50, y: 50 });
      clinic.addComponent(createHealthClinicComponent());

      // Add staff
      clinic.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        currentStaff: ['healer-1'],
      }));

      governanceSystem.update(harness.world, [], 0);

      const clinicComponent = clinic.getComponent<HealthClinicComponent>('health_clinic');
      expect(clinicComponent?.dataQuality).toBe('full');
    });
  });

  describe('Multiple Buildings', () => {
    it('should update all governance buildings in one update', () => {
      const townHall = harness.createTestBuilding('town_hall', { x: 50, y: 50 });
      townHall.addComponent(createTownHallComponent());

      const bureau = harness.createTestBuilding('census_bureau', { x: 60, y: 60 });
      bureau.addComponent(createCensusBureauComponent());

      const clinic = harness.createTestBuilding('health_clinic', { x: 70, y: 70 });
      clinic.addComponent(createHealthClinicComponent());

      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createIdentityComponent('TestAgent'));
      agent.addComponent(createAgentComponent('test', 'wander'));
      agent.addComponent(createNeedsComponent(80, 80, 80, 80, 80));

      governanceSystem.update(harness.world, [], 0);

      // All buildings should be updated
      const townHallComponent = townHall.getComponent<TownHallComponent>('town_hall');
      expect(townHallComponent?.populationCount).toBe(1);

      const bureauComponent = bureau.getComponent<CensusBureauComponent>('census_bureau');
      expect(bureauComponent?.demographics.adults).toBe(1);

      const clinicComponent = clinic.getComponent<HealthClinicComponent>('health_clinic');
      expect(clinicComponent?.populationHealth.healthy).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero population', () => {
      const townHall = harness.createTestBuilding('town_hall', { x: 50, y: 50 });
      townHall.addComponent(createTownHallComponent());

      governanceSystem.update(harness.world, [], 0);

      const townHallComponent = townHall.getComponent<TownHallComponent>('town_hall');
      expect(townHallComponent?.populationCount).toBe(0);
      expect(townHallComponent?.agents).toEqual([]);
    });

    it('should handle missing building component gracefully', () => {
      const building = harness.createTestAgent({ x: 10, y: 10 }); // Not actually a building
      building.addComponent(createTownHallComponent());

      // Should not crash
      expect(() => {
        governanceSystem.update(harness.world, [], 0);
      }).not.toThrow();
    });

    it('should handle agents without identity component', () => {
      const townHall = harness.createTestBuilding('town_hall', { x: 50, y: 50 });
      townHall.addComponent(createTownHallComponent());

      const agent = harness.createTestAgent({ x: 10, y: 10 });
      // No identity component

      governanceSystem.update(harness.world, [], 0);

      const townHallComponent = townHall.getComponent<TownHallComponent>('town_hall');
      expect(townHallComponent?.populationCount).toBe(0); // Should not count agents without identity
    });
  });
});
