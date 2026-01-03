/**
 * Unit tests for VRSystemComponent
 *
 * Tests VR system creation and configuration.
 */

import { describe, it, expect } from 'vitest';
import {
  createVRSystemComponent,
  VRSystemComponentSchema,
  type VRSystemComponent,
  type VRSystemType,
} from '../VRSystemComponent.js';

describe('VRSystemComponent', () => {
  describe('createVRSystemComponent', () => {
    it('creates a shadow_realm with correct defaults', () => {
      const vr = createVRSystemComponent('shadow_realm', 'Test Shadow Realm');

      expect(vr.type).toBe('vr_system');
      expect(vr.version).toBe(1);
      expect(vr.vr_type).toBe('shadow_realm');
      expect(vr.name).toBe('Test Shadow Realm');
      expect(vr.simulation.fidelity).toBe(0.99);
      expect(vr.simulation.narrative_weight).toBe(0.01);
      expect(vr.active_sessions).toHaveLength(0);
      expect(vr.max_concurrent_sessions).toBe(10);
      expect(vr.max_participants_per_session).toBe(1);
    });

    it('creates a remembrance_space with correct properties', () => {
      const vr = createVRSystemComponent('remembrance_space', 'Memory Hall');

      expect(vr.vr_type).toBe('remembrance_space');
      expect(vr.simulation.fidelity).toBe(0.95);
      expect(vr.simulation.narrative_weight).toBe(0.5);
      expect(vr.max_participants_per_session).toBe(1);
    });

    it('creates a feeling_forge with correct properties', () => {
      const vr = createVRSystemComponent('feeling_forge', 'Emotion Workshop');

      expect(vr.vr_type).toBe('feeling_forge');
      expect(vr.simulation.fidelity).toBe(0.95);
      expect(vr.simulation.narrative_weight).toBe(0.5);
    });

    it('creates a shared_dream with high participant capacity', () => {
      const vr = createVRSystemComponent('shared_dream', 'Collective Dream');

      expect(vr.vr_type).toBe('shared_dream');
      expect(vr.max_participants_per_session).toBe(100);
      expect(vr.simulation.fidelity).toBe(0.95);
    });

    it('creates a recursion_realm with correct properties', () => {
      const vr = createVRSystemComponent('recursion_realm', 'Nested Reality');

      expect(vr.vr_type).toBe('recursion_realm');
      expect(vr.simulation.fidelity).toBe(0.95);
      expect(vr.simulation.narrative_weight).toBe(0.5);
    });

    it('initializes with no active sessions', () => {
      const vr = createVRSystemComponent('feeling_forge', 'Test VR');

      expect(vr.active_sessions).toEqual([]);
    });
  });

  describe('VRSystemComponentSchema', () => {
    it('validates a valid VR system component', () => {
      const vr = createVRSystemComponent('shadow_realm', 'Valid VR');

      expect(VRSystemComponentSchema.validate(vr)).toBe(true);
    });

    it('rejects invalid data', () => {
      const invalid = {
        type: 'wrong_type',
        vr_type: 'shadow_realm',
        name: 'Invalid VR',
      };

      expect(VRSystemComponentSchema.validate(invalid)).toBe(false);
    });

    it('rejects data without vr_type', () => {
      const invalid = {
        type: 'vr_system',
        name: 'Invalid VR',
      };

      expect(VRSystemComponentSchema.validate(invalid)).toBe(false);
    });

    it('rejects data without name', () => {
      const invalid = {
        type: 'vr_system',
        vr_type: 'shadow_realm',
      };

      expect(VRSystemComponentSchema.validate(invalid)).toBe(false);
    });

    it('creates default VR system', () => {
      const defaultVR = VRSystemComponentSchema.createDefault();

      expect(defaultVR.vr_type).toBe('shadow_realm');
      expect(defaultVR.name).toBe('Default VR System');
      expect(VRSystemComponentSchema.validate(defaultVR)).toBe(true);
    });
  });

  describe('VR Type Behaviors', () => {
    it('shadow_realm has high fidelity and low narrative weight', () => {
      const vr = createVRSystemComponent('shadow_realm', 'Shadow Realm');

      expect(vr.simulation.fidelity).toBe(0.99);
      expect(vr.simulation.narrative_weight).toBe(0.01);
    });

    const normalVRTypes: VRSystemType[] = [
      'remembrance_space',
      'feeling_forge',
      'recursion_realm',
    ];

    normalVRTypes.forEach((vrType) => {
      it(`${vrType} has standard fidelity and narrative weight`, () => {
        const vr = createVRSystemComponent(vrType, 'Test VR');

        expect(vr.simulation.fidelity).toBe(0.95);
        expect(vr.simulation.narrative_weight).toBe(0.5);
      });
    });

    it('shared_dream allows many participants', () => {
      const vr = createVRSystemComponent('shared_dream', 'Shared Dream');

      expect(vr.max_participants_per_session).toBe(100);
    });

    it('most VR types allow only one participant', () => {
      const singleParticipantTypes: VRSystemType[] = [
        'shadow_realm',
        'remembrance_space',
        'feeling_forge',
        'recursion_realm',
      ];

      singleParticipantTypes.forEach((vrType) => {
        const vr = createVRSystemComponent(vrType, 'Test VR');
        expect(vr.max_participants_per_session).toBe(1);
      });
    });

    it('all VR types have the same max concurrent sessions', () => {
      const allTypes: VRSystemType[] = [
        'shadow_realm',
        'remembrance_space',
        'feeling_forge',
        'shared_dream',
        'recursion_realm',
      ];

      allTypes.forEach((vrType) => {
        const vr = createVRSystemComponent(vrType, 'Test VR');
        expect(vr.max_concurrent_sessions).toBe(10);
      });
    });
  });
});
