/**
 * Unit tests for SpaceshipComponent
 *
 * Tests spaceship creation and configuration.
 */

import { describe, it, expect } from 'vitest';
import {
  createSpaceshipComponent,
  SpaceshipComponentSchema,
  type SpaceshipComponent,
  type SpaceshipType,
} from '../SpaceshipComponent.js';

describe('SpaceshipComponent', () => {
  describe('createSpaceshipComponent', () => {
    it('creates a worldship with correct defaults', () => {
      const ship = createSpaceshipComponent('worldship', 'Test Worldship');

      expect(ship.type).toBe('spaceship');
      expect(ship.version).toBe(1);
      expect(ship.ship_type).toBe('worldship');
      expect(ship.name).toBe('Test Worldship');
      expect(ship.hull.integrity).toBe(1.0);
      expect(ship.hull.mass).toBe(1000000);
      expect(ship.navigation.can_navigate_beta_space).toBe(false);
      expect(ship.crew.member_ids).toHaveLength(0);
      expect(ship.crew.coherence).toBe(0);
    });

    it('creates a threshold_ship with correct navigation settings', () => {
      const ship = createSpaceshipComponent('threshold_ship', 'Threshold Explorer');

      expect(ship.ship_type).toBe('threshold_ship');
      expect(ship.hull.mass).toBe(1000);
      expect(ship.navigation.can_navigate_beta_space).toBe(true);
      expect(ship.navigation.max_emotional_distance).toBe(100);
    });

    it('creates a story_ship with correct properties', () => {
      const ship = createSpaceshipComponent('story_ship', 'Narrative Vessel');

      expect(ship.ship_type).toBe('story_ship');
      expect(ship.navigation.can_navigate_beta_space).toBe(true);
      expect(ship.narrative.accumulated_weight).toBe(0);
      expect(ship.narrative.significant_events).toHaveLength(0);
    });

    it('creates a gleisner_vessel with correct properties', () => {
      const ship = createSpaceshipComponent('gleisner_vessel', 'Digital Ship');

      expect(ship.ship_type).toBe('gleisner_vessel');
      expect(ship.navigation.can_navigate_beta_space).toBe(true);
      expect(ship.components.emotion_theater_ids).toHaveLength(0);
      expect(ship.components.vr_system_ids).toHaveLength(0);
    });

    it('initializes crew with empty emotional state', () => {
      const ship = createSpaceshipComponent('story_ship', 'Test Ship');

      expect(ship.crew.collective_emotional_state.emotions).toEqual({});
      expect(ship.crew.member_ids).toHaveLength(0);
      expect(ship.crew.coherence).toBe(0);
    });

    it('initializes personality with empty arrays', () => {
      const ship = createSpaceshipComponent('threshold_ship', 'Test Ship');

      expect(ship.narrative.personality.dominant_emotions).toHaveLength(0);
      expect(ship.narrative.personality.preferences.destination_types).toHaveLength(0);
      expect(ship.narrative.personality.preferences.mission_types).toHaveLength(0);
      expect(ship.narrative.personality.resistance.to_emotions).toHaveLength(0);
      expect(ship.narrative.personality.resistance.to_destinations).toHaveLength(0);
    });

    it('initializes component IDs as empty arrays', () => {
      const ship = createSpaceshipComponent('worldship', 'Test Ship');

      expect(ship.components.the_heart_id).toBeUndefined();
      expect(ship.components.emotion_theater_ids).toHaveLength(0);
      expect(ship.components.memory_hall_ids).toHaveLength(0);
      expect(ship.components.meditation_chamber_ids).toHaveLength(0);
      expect(ship.components.vr_system_ids).toHaveLength(0);
    });
  });

  describe('SpaceshipComponentSchema', () => {
    it('validates a valid spaceship component', () => {
      const ship = createSpaceshipComponent('threshold_ship', 'Valid Ship');

      expect(SpaceshipComponentSchema.validate(ship)).toBe(true);
    });

    it('rejects invalid data', () => {
      const invalid = {
        type: 'wrong_type',
        ship_type: 'worldship',
        name: 'Invalid Ship',
      };

      expect(SpaceshipComponentSchema.validate(invalid)).toBe(false);
    });

    it('rejects data without ship_type', () => {
      const invalid = {
        type: 'spaceship',
        name: 'Invalid Ship',
      };

      expect(SpaceshipComponentSchema.validate(invalid)).toBe(false);
    });

    it('rejects data without name', () => {
      const invalid = {
        type: 'spaceship',
        ship_type: 'worldship',
      };

      expect(SpaceshipComponentSchema.validate(invalid)).toBe(false);
    });

    it('creates default spaceship', () => {
      const defaultShip = SpaceshipComponentSchema.createDefault();

      expect(defaultShip.ship_type).toBe('worldship');
      expect(defaultShip.name).toBe('Untitled Ship');
      expect(SpaceshipComponentSchema.validate(defaultShip)).toBe(true);
    });
  });

  describe('Ship Type Behaviors', () => {
    it('worldship cannot navigate beta-space', () => {
      const worldship = createSpaceshipComponent('worldship', 'Big Ship');

      expect(worldship.navigation.can_navigate_beta_space).toBe(false);
    });

    const navigableShipTypes: SpaceshipType[] = [
      'threshold_ship',
      'story_ship',
      'gleisner_vessel',
    ];

    navigableShipTypes.forEach((shipType) => {
      it(`${shipType} can navigate beta-space`, () => {
        const ship = createSpaceshipComponent(shipType, 'Test Ship');

        expect(ship.navigation.can_navigate_beta_space).toBe(true);
      });
    });

    it('worldship has much greater mass than other ships', () => {
      const worldship = createSpaceshipComponent('worldship', 'Big Ship');
      const threshold = createSpaceshipComponent('threshold_ship', 'Small Ship');

      expect(worldship.hull.mass).toBeGreaterThan(threshold.hull.mass * 100);
    });
  });
});
