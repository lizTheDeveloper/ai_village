/**
 * ShipCombatSystem - Verification Test
 *
 * This test verifies that the ship-to-ship combat system is fully functional:
 * - Multi-phase combat (range, close, boarding)
 * - Damage calculation and hull integrity
 * - Crew coherence and casualties
 * - Combat event emission
 * - Ship destruction and capture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { EntityImpl } from '../../ecs/Entity.js';
import { ShipCombatSystem } from '../ShipCombatSystem.js';
import type { SpaceshipComponent } from '../../navigation/SpaceshipComponent.js';
import type { ShipCrewComponent } from '../../components/ShipCrewComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('ShipCombatSystem', () => {
  let world: World;
  let shipCombatSystem: ShipCombatSystem;

  beforeEach(() => {
    world = new World();
    shipCombatSystem = new ShipCombatSystem();
  });

  /**
   * Helper: Create a test ship entity with crew
   */
  function createTestShip(
    name: string,
    hullMass: number,
    hullIntegrity: number,
    crewCount: number,
    coherence: number
  ): EntityImpl {
    const ship = world.createEntity();

    // Add spaceship component
    ship.addComponent<SpaceshipComponent>({
      type: 'spaceship',
      version: 1,
      ship_type: 'threshold_ship',
      name,
      hull: {
        integrity: hullIntegrity,
        mass: hullMass,
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
        coherence,
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

    // Add crew members
    for (let i = 0; i < crewCount; i++) {
      const crew = world.createEntity();
      crew.addComponent<ShipCrewComponent>({
        type: 'ship_crew',
        version: 1,
        shipId: ship.id,
        role: i === 0 ? 'captain' : i < 5 ? 'officer' : i < 10 ? 'nco' : 'marine',
        rank: i === 0 ? 'admiral' : i < 5 ? 'lieutenant' : 'ensign',
        experience: {
          total_missions: 10,
          combat_experience: 5,
          navigation_experience: 8,
        },
        stress: {
          current: 0.2,
          threshold: 0.5,
          factors: {
            combat: 0,
            navigation: 0,
            time_away: 0.2,
          },
        },
        morale: 0.8,
        quantum_coupling: coherence,
        quantumCoupling: coherence,
        specialty: 'navigation',
      });
    }

    return ship;
  }

  it('should initiate ship combat', () => {
    const attacker = createTestShip('HMS Attacker', 1000, 1.0, 20, 0.8);
    const defender = createTestShip('Enemy Defender', 1000, 1.0, 20, 0.7);

    const encounter = shipCombatSystem.initiateShipCombat(world, attacker, defender);

    expect(encounter).toBeDefined();
    expect(encounter.attackerId).toBe(attacker.id);
    expect(encounter.defenderId).toBe(defender.id);
    expect(encounter.phase).toBe('range');
    expect(encounter.attackerHullIntegrity).toBe(1.0);
    expect(encounter.defenderHullIntegrity).toBe(1.0);
    expect(encounter.attackerCoherence).toBeGreaterThan(0);
    expect(encounter.defenderCoherence).toBeGreaterThan(0);
  });

  it('should resolve range phase with damage', () => {
    const attacker = createTestShip('HMS Attacker', 1000, 1.0, 20, 0.8);
    const defender = createTestShip('Enemy Defender', 1000, 1.0, 20, 0.7);

    const encounter = shipCombatSystem.initiateShipCombat(world, attacker, defender);
    const updatedEncounter = shipCombatSystem.resolveRangePhase(world, encounter);

    // Both ships should take damage
    expect(updatedEncounter.attackerHullIntegrity).toBeLessThan(1.0);
    expect(updatedEncounter.defenderHullIntegrity).toBeLessThan(1.0);

    // Coherence should degrade from combat stress
    expect(updatedEncounter.attackerCoherence).toBeLessThan(encounter.attackerCoherence);
    expect(updatedEncounter.defenderCoherence).toBeLessThan(encounter.defenderCoherence);

    // Should advance to close phase
    expect(updatedEncounter.phase).toBe('close');
  });

  it('should resolve close phase with higher damage and coherence attacks', () => {
    const attacker = createTestShip('HMS Attacker', 1000, 0.8, 20, 0.8);
    const defender = createTestShip('Enemy Defender', 1000, 0.8, 20, 0.7);

    const encounter = shipCombatSystem.initiateShipCombat(world, attacker, defender);
    encounter.phase = 'close';
    encounter.attackerHullIntegrity = 0.8;
    encounter.defenderHullIntegrity = 0.8;

    const updatedEncounter = shipCombatSystem.resolveClosePhase(world, encounter);

    // Close phase should deal more damage than range phase
    expect(updatedEncounter.attackerHullIntegrity).toBeLessThan(0.8);
    expect(updatedEncounter.defenderHullIntegrity).toBeLessThan(0.8);

    // Coherence should degrade faster in close phase
    expect(updatedEncounter.attackerCoherence).toBeLessThan(encounter.attackerCoherence);
    expect(updatedEncounter.defenderCoherence).toBeLessThan(encounter.defenderCoherence);

    // Should advance to boarding phase
    expect(updatedEncounter.phase).toBe('boarding');
  });

  it('should resolve boarding phase with capture attempt', () => {
    const attacker = createTestShip('HMS Attacker', 1000, 0.6, 30, 0.7); // More marines
    const defender = createTestShip('Enemy Defender', 1000, 0.4, 10, 0.3); // Weak defender

    const encounter = shipCombatSystem.initiateShipCombat(world, attacker, defender);
    encounter.phase = 'boarding';
    encounter.attackerHullIntegrity = 0.6;
    encounter.defenderHullIntegrity = 0.4;
    encounter.defenderCoherence = 0.3; // Low coherence makes capture easier

    const updatedEncounter = shipCombatSystem.resolveBoardingPhase(world, encounter);

    // Combat should be resolved
    expect(updatedEncounter.phase).toBe('resolved');

    // Attacker should win (more marines, defender has low coherence)
    expect(updatedEncounter.victor).toBe(attacker.id);
  });

  it('should destroy ship when hull integrity reaches zero', () => {
    const attacker = createTestShip('HMS Attacker', 2000, 1.0, 20, 0.9); // Bigger, stronger
    const defender = createTestShip('Weak Defender', 500, 0.1, 5, 0.5); // Small, damaged

    const encounter = shipCombatSystem.initiateShipCombat(world, attacker, defender);
    const updatedEncounter = shipCombatSystem.resolveRangePhase(world, encounter);

    // Defender should be destroyed (low hull integrity)
    expect(updatedEncounter.phase).toBe('resolved');
    expect(updatedEncounter.victor).toBe(attacker.id);
    expect(updatedEncounter.destroyed).toBe(defender.id);
  });

  it('should emit combat events', () => {
    const attacker = createTestShip('HMS Attacker', 1000, 1.0, 20, 0.8);
    const defender = createTestShip('Enemy Defender', 1000, 1.0, 20, 0.7);

    const events: Array<{ type: string; data: unknown }> = [];
    world.eventBus.on('*', (event) => {
      events.push(event);
    });

    shipCombatSystem.initiateShipCombat(world, attacker, defender);

    // Should emit combat_started event
    const startedEvent = events.find((e) => e.type === 'ship:combat_started');
    expect(startedEvent).toBeDefined();
  });

  it('should calculate firepower based on hull mass and coherence', () => {
    const largeShip = createTestShip('Battleship', 10000, 1.0, 50, 0.9);
    const smallShip = createTestShip('Corvette', 100, 1.0, 5, 0.6);

    const encounter = shipCombatSystem.initiateShipCombat(world, largeShip, smallShip);
    const result = shipCombatSystem.resolveRangePhase(world, encounter);

    // Large ship should deal more damage to small ship
    // Small ship should take proportionally more damage (damage / mass)
    expect(result.defenderHullIntegrity).toBeLessThan(result.attackerHullIntegrity);
  });

  it('should track encounter state', () => {
    const attacker = createTestShip('HMS Attacker', 1000, 1.0, 20, 0.8);
    const defender = createTestShip('Enemy Defender', 1000, 1.0, 20, 0.7);

    const encounter = shipCombatSystem.initiateShipCombat(world, attacker, defender);

    // Should be able to retrieve encounter
    const retrieved = shipCombatSystem.getEncounter(attacker.id, defender.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.attackerId).toBe(attacker.id);
    expect(retrieved?.defenderId).toBe(defender.id);

    // Should be able to remove encounter
    shipCombatSystem.removeEncounter(attacker.id, defender.id);
    const removed = shipCombatSystem.getEncounter(attacker.id, defender.id);
    expect(removed).toBeUndefined();
  });

  it('should handle multiple combat phases in sequence', () => {
    const attacker = createTestShip('HMS Attacker', 1000, 1.0, 20, 0.8);
    const defender = createTestShip('Enemy Defender', 1000, 1.0, 20, 0.7);

    // Initiate combat
    let encounter = shipCombatSystem.initiateShipCombat(world, attacker, defender);
    expect(encounter.phase).toBe('range');

    // Resolve range phase
    encounter = shipCombatSystem.resolveRangePhase(world, encounter);
    expect(encounter.phase).toBe('close');

    // Resolve close phase
    encounter = shipCombatSystem.resolveClosePhase(world, encounter);
    expect(encounter.phase).toBe('boarding');

    // Resolve boarding phase
    encounter = shipCombatSystem.resolveBoardingPhase(world, encounter);
    expect(encounter.phase).toBe('resolved');
  });
});
