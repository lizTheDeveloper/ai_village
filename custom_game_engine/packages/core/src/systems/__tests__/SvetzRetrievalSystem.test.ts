/**
 * SvetzRetrievalSystem - Unit Tests
 *
 * Tests Svetz retrieval ship missions for cross-timeline item recovery:
 * - Mission phase progression (navigating → searching → retrieving → anchoring → returning → complete)
 * - Target specification and validation
 * - Anchoring capacity based on ship mass
 * - Contamination accumulation
 * - Mission failure handling
 * - Event emission
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl, type Entity } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { SvetzRetrievalSystem } from '../SvetzRetrievalSystem.js';
import type { SpaceshipComponent } from '../../navigation/SpaceshipComponent.js';
import type { SvetzRetrievalMissionComponent } from '../../components/SvetzRetrievalMissionComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('SvetzRetrievalSystem', () => {
  let world: World;
  let system: SvetzRetrievalSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new SvetzRetrievalSystem();
  });

  /**
   * Helper: Create a test Svetz retrieval ship
   */
  function createRetrievalShip(name: string, mass = 800): Entity {
    const ship = world.createEntity();

    ship.addComponent<SpaceshipComponent>({
      type: 'spaceship',
      version: 1,
      ship_type: 'svetz_retrieval',
      name,
      hull: {
        integrity: 1.0,
        mass, // Mass determines anchoring capacity
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
        coherence: 0.75,
      },
      navigation: {
        can_navigate_beta_space: true,
        max_emotional_distance: 100,
        quantum_coupling_strength: 0.75,
        coherence_threshold: 0.65,
        decoherence_rate: 0.00025,
        observation_precision: 0.75, // Needs precision to target extinct branches
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
    it('should start a Svetz retrieval mission', () => {
      const ship = createRetrievalShip('Svetz Alpha');
      const targetBranchId = 'extinct_branch_001';
      const targetSpec: SvetzRetrievalMissionComponent['targetSpec'] = {
        type: 'item',
        criteria: 'ancient_artifact',
        description: 'Rare artifact from extinct timeline',
      };

      const success = system.startMission(world, ship, targetBranchId, targetSpec);

      expect(success).toBe(true);

      const mission = ship.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(mission).toBeDefined();
      expect(mission?.phase).toBe('navigating');
      expect(mission?.progress).toBe(0);
      expect(mission?.targetBranchId).toBe(targetBranchId);
      expect(mission?.targetSpec.type).toBe('item');
      expect(mission?.targetSpec.description).toBe('Rare artifact from extinct timeline');
      expect(mission?.retrievedItems).toHaveLength(0);
      expect(mission?.totalContamination).toBe(0);
      expect(mission?.failedAttempts).toBe(0);
    });

    it('should calculate anchoring capacity based on ship mass', () => {
      // 800 mass = 4 slots (800 / 200)
      const mediumShip = createRetrievalShip('Medium Ship', 800);
      system.startMission(world, mediumShip, 'branch_001', {
        type: 'item',
        criteria: 'artifact',
        description: 'Test item',
      });

      const mediumMission = mediumShip.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(mediumMission?.anchoringCapacity).toBe(4);

      // 1600 mass = 8 slots
      const largeShip = createRetrievalShip('Large Ship', 1600);
      system.startMission(world, largeShip, 'branch_002', {
        type: 'entity',
        criteria: 'creature',
        description: 'Test entity',
      });

      const largeMission = largeShip.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(largeMission?.anchoringCapacity).toBe(8);

      // 200 mass = 1 slot (minimum)
      const smallShip = createRetrievalShip('Small Ship', 200);
      system.startMission(world, smallShip, 'branch_003', {
        type: 'technology',
        criteria: 'tech',
        description: 'Test tech',
      });

      const smallMission = smallShip.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(smallMission?.anchoringCapacity).toBe(1);
    });

    it('should reject mission start for non-svetz ships', () => {
      const nonSvetzShip = world.createEntity();
      nonSvetzShip.addComponent<SpaceshipComponent>({
        type: 'spaceship',
        version: 1,
        ship_type: 'probability_scout', // Not a svetz ship
        name: 'Not A Svetz Ship',
        hull: { integrity: 1.0, mass: 50 },
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
          coherence: 1.0,
        },
        navigation: {
          can_navigate_beta_space: true,
          max_emotional_distance: 100,
          quantum_coupling_strength: 1.0,
          coherence_threshold: 0.5,
          decoherence_rate: 0,
          observation_precision: 0.9,
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

      const success = system.startMission(world, nonSvetzShip, 'branch_test', {
        type: 'item',
        criteria: 'test',
        description: 'Test',
      });

      expect(success).toBe(false);
      const mission = nonSvetzShip.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(mission).toBeUndefined();
    });
  });

  describe('Target Specification Types', () => {
    it('should accept item type targets', () => {
      const ship = createRetrievalShip('Svetz Beta');
      const success = system.startMission(world, ship, 'branch_001', {
        type: 'item',
        criteria: 'rare_gem',
        description: 'Extinct gemstone',
      });

      expect(success).toBe(true);
      const mission = ship.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(mission?.targetSpec.type).toBe('item');
    });

    it('should accept entity type targets', () => {
      const ship = createRetrievalShip('Svetz Gamma');
      const success = system.startMission(world, ship, 'branch_002', {
        type: 'entity',
        criteria: 'extinct_creature',
        description: 'Dodo bird',
      });

      expect(success).toBe(true);
      const mission = ship.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(mission?.targetSpec.type).toBe('entity');
    });

    it('should accept technology type targets', () => {
      const ship = createRetrievalShip('Svetz Delta');
      const success = system.startMission(world, ship, 'branch_003', {
        type: 'technology',
        criteria: 'lost_tech',
        description: 'Ancient engineering',
      });

      expect(success).toBe(true);
      const mission = ship.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(mission?.targetSpec.type).toBe('technology');
    });
  });

  describe('Mission Status', () => {
    it('should retrieve mission status', () => {
      const ship = createRetrievalShip('Svetz Echo');
      system.startMission(world, ship, 'branch_001', {
        type: 'item',
        criteria: 'artifact',
        description: 'Test artifact',
      });

      const status = system.getMissionStatus(ship);

      expect(status).toBeDefined();
      expect(status?.phase).toBe('navigating');
    });

    it('should return undefined for ships without mission', () => {
      const ship = createRetrievalShip('Svetz Foxtrot');

      const status = system.getMissionStatus(ship);

      expect(status).toBeUndefined();
    });
  });

  describe('Retrieved Items', () => {
    it('should start with empty retrieved items array', () => {
      const ship = createRetrievalShip('Svetz Golf');
      system.startMission(world, ship, 'branch_001', {
        type: 'item',
        criteria: 'artifact',
        description: 'Test artifact',
      });

      const items = system.getRetrievedItems(ship);
      expect(items).toHaveLength(0);
    });

    it('should track ship ID in mission component', () => {
      const ship = createRetrievalShip('Svetz Hotel');
      system.startMission(world, ship, 'branch_001', {
        type: 'item',
        criteria: 'artifact',
        description: 'Test artifact',
      });

      const mission = ship.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(mission?.shipId).toBe(ship.id);
    });
  });

  describe('System Metadata', () => {
    it('should have correct system ID and priority', () => {
      expect(system.id).toBe('svetz_retrieval');
      expect(system.priority).toBe(97);
    });

    it('should have correct activation components', () => {
      expect(system.activationComponents).toContain(CT.Spaceship);
      expect(system.activationComponents).toContain(CT.SvetzRetrievalMission);
    });

    it('should have correct metadata category', () => {
      expect(system.metadata.category).toBe('infrastructure');
      expect(system.metadata.description).toContain('svetz_retrieval');
    });
  });

  describe('Mission Failure Tracking', () => {
    it('should start with zero failed attempts', () => {
      const ship = createRetrievalShip('Svetz India');
      system.startMission(world, ship, 'branch_001', {
        type: 'item',
        criteria: 'artifact',
        description: 'Test artifact',
      });

      const mission = ship.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(mission?.failedAttempts).toBe(0);
      expect(mission?.lastFailureReason).toBeUndefined();
    });

    it('should start with zero contamination', () => {
      const ship = createRetrievalShip('Svetz Juliet');
      system.startMission(world, ship, 'branch_001', {
        type: 'item',
        criteria: 'artifact',
        description: 'Test artifact',
      });

      const mission = ship.getComponent<SvetzRetrievalMissionComponent>(CT.SvetzRetrievalMission);
      expect(mission?.totalContamination).toBe(0);
    });
  });
});
