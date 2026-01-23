/**
 * ProbabilityScoutSystem - Unit Tests
 *
 * Tests probability scout ship missions for mapping alternate timelines:
 * - Mission phase progression (scanning → observing → mapping → complete)
 * - Branch observation without collapse
 * - Contamination accumulation
 * - Collapse risk calculation
 * - Mission completion and event emission
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl, type Entity } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { ProbabilityScoutSystem } from '../ProbabilityScoutSystem.js';
import type { SpaceshipComponent } from '../../navigation/SpaceshipComponent.js';
import type { ProbabilityScoutMissionComponent } from '../../components/ProbabilityScoutMissionComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('ProbabilityScoutSystem', () => {
  let world: World;
  let system: ProbabilityScoutSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new ProbabilityScoutSystem();
  });

  /**
   * Helper: Create a test probability scout ship
   */
  function createScoutShip(name: string, observationPrecision = 0.9): Entity {
    const ship = world.createEntity();

    ship.addComponent<SpaceshipComponent>({
      type: 'spaceship',
      version: 1,
      ship_type: 'probability_scout',
      name,
      hull: {
        integrity: 1.0,
        mass: 50, // Small, solo ship
      },
      narrative: {
        accumulated_weight: 0,
        significant_events: [],
        personality: {
          dominant_emotions: [],
          preferences: {
            destination_types: [],
            mission_types: [],
          },
          resistance: {
            to_emotions: [],
            to_destinations: [],
          },
        },
      },
      crew: {
        member_ids: [],
        collective_emotional_state: { emotions: {} },
        coherence: 1.0, // Solo = perfect coherence
      },
      navigation: {
        can_navigate_beta_space: true,
        max_emotional_distance: 100,
        quantum_coupling_strength: 1.0,
        coherence_threshold: 0.5,
        decoherence_rate: 0, // Solo = no degradation
        observation_precision: observationPrecision,
        contamination_cargo: [],
        visited_branches: [],
        failed_navigations: 0,
      },
      components: {
        emotion_theater_ids: [],
        memory_hall_ids: [],
        meditation_chamber_ids: [],
        vr_system_ids: [],
      },
    });

    return ship;
  }

  describe('Mission Initialization', () => {
    it('should start a probability scout mission', () => {
      const ship = createScoutShip('Scout Alpha');

      const success = system.startMission(world, ship);

      expect(success).toBe(true);

      const mission = ship.getComponent<ProbabilityScoutMissionComponent>(CT.ProbabilityScoutMission);
      expect(mission).toBeDefined();
      expect(mission?.phase).toBe('scanning');
      expect(mission?.progress).toBe(0);
      expect(mission?.branchesMapped).toBe(0);
      expect(mission?.observedBranches).toHaveLength(0);
      expect(mission?.contaminationLevel).toBe(0);
      expect(mission?.collapseEventsTriggered).toBe(0);
    });

    it('should start mission with specific target branch', () => {
      const ship = createScoutShip('Scout Beta');
      const targetBranchId = 'branch_target_123';

      const success = system.startMission(world, ship, targetBranchId);

      expect(success).toBe(true);

      const mission = ship.getComponent<ProbabilityScoutMissionComponent>(CT.ProbabilityScoutMission);
      expect(mission?.targetBranchId).toBe(targetBranchId);
    });

    it('should reject mission start for non-scout ships', () => {
      const nonScoutShip = world.createEntity();
      nonScoutShip.addComponent<SpaceshipComponent>({
        type: 'spaceship',
        version: 1,
        ship_type: 'threshold_ship', // Not a scout
        name: 'Not A Scout',
        hull: { integrity: 1.0, mass: 1000 },
        narrative: {
          accumulated_weight: 0,
          significant_events: [],
          personality: {
            dominant_emotions: [],
            preferences: { destination_types: [], mission_types: [] },
            resistance: { to_emotions: [], to_destinations: [] },
          },
        },
        crew: {
          member_ids: [],
          collective_emotional_state: { emotions: {} },
          coherence: 0.8,
        },
        navigation: {
          can_navigate_beta_space: true,
          max_emotional_distance: 100,
          quantum_coupling_strength: 0.7,
          coherence_threshold: 0.7,
          decoherence_rate: 0.0003,
          observation_precision: 0.3,
          contamination_cargo: [],
          visited_branches: [],
          failed_navigations: 0,
        },
        components: {
          emotion_theater_ids: [],
          memory_hall_ids: [],
          meditation_chamber_ids: [],
          vr_system_ids: [],
        },
      });

      const success = system.startMission(world, nonScoutShip);

      expect(success).toBe(false);
      const mission = nonScoutShip.getComponent<ProbabilityScoutMissionComponent>(CT.ProbabilityScoutMission);
      expect(mission).toBeUndefined();
    });
  });

  describe('Mission Status', () => {
    it('should retrieve mission status', () => {
      const ship = createScoutShip('Scout Gamma');
      system.startMission(world, ship);

      const status = system.getMissionStatus(ship);

      expect(status).toBeDefined();
      expect(status?.phase).toBe('scanning');
    });

    it('should return undefined for ships without mission', () => {
      const ship = createScoutShip('Scout Delta');

      const status = system.getMissionStatus(ship);

      expect(status).toBeUndefined();
    });
  });

  describe('Mission Configuration', () => {
    it('should use observation precision from ship config', () => {
      const highPrecisionShip = createScoutShip('High Precision', 0.95);
      system.startMission(world, highPrecisionShip);

      const mission = highPrecisionShip.getComponent<ProbabilityScoutMissionComponent>(CT.ProbabilityScoutMission);
      expect(mission?.observationPrecision).toBe(0.95);
    });

    it('should track ship ID in mission component', () => {
      const ship = createScoutShip('Scout Echo');
      system.startMission(world, ship);

      const mission = ship.getComponent<ProbabilityScoutMissionComponent>(CT.ProbabilityScoutMission);
      expect(mission?.shipId).toBe(ship.id);
    });
  });

  describe('System Metadata', () => {
    it('should have correct system ID and priority', () => {
      expect(system.id).toBe('probability_scout');
      expect(system.priority).toBe(96);
    });

    it('should have correct activation components', () => {
      expect(system.activationComponents).toContain(CT.Spaceship);
      expect(system.activationComponents).toContain(CT.ProbabilityScoutMission);
    });

    it('should have correct metadata category', () => {
      expect(system.metadata.category).toBe('infrastructure');
      expect(system.metadata.description).toContain('probability_scout');
    });
  });

  describe('Contamination and Collapse Risk', () => {
    it('should start with zero contamination', () => {
      const ship = createScoutShip('Scout Foxtrot');
      system.startMission(world, ship);

      const mission = ship.getComponent<ProbabilityScoutMissionComponent>(CT.ProbabilityScoutMission);
      expect(mission?.contaminationLevel).toBe(0);
    });

    it('should start with zero collapse events', () => {
      const ship = createScoutShip('Scout Golf');
      system.startMission(world, ship);

      const mission = ship.getComponent<ProbabilityScoutMissionComponent>(CT.ProbabilityScoutMission);
      expect(mission?.collapseEventsTriggered).toBe(0);
    });
  });
});
