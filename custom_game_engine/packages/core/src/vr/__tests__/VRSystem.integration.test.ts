/**
 * Integration tests for VRSystem
 *
 * Tests the VR system with full ECS context.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { VRSystem } from '../VRSystem.js';
import { createVRSystemComponent } from '../VRSystemComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('VRSystem Integration Tests', () => {
  let harness: IntegrationTestHarness;
  let system: VRSystem;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: true });
    system = new VRSystem();
    system.initialize(harness.world, harness.eventBus);
  });

  describe('System Basics', () => {
    it('has correct system properties', () => {
      expect(system.id).toBe('vr_system');
      expect(system.priority).toBe(160);
      expect(system.requiredComponents).toContain(CT.VRSystem);
    });

    it('updates without errors when no VR systems exist', () => {
      expect(() => {
        system.update(harness.world, [], 0.05);
      }).not.toThrow();
    });
  });

  describe('VR System Processing', () => {
    it('processes VR systems without errors', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      vrEntity.addComponent(createVRSystemComponent('shadow_realm', 'Test Shadow Realm'));
      (harness.world as any)._addEntity(vrEntity);

      system.update(harness.world, [vrEntity], 0.05);

      const vrComp = vrEntity.getComponent(CT.VRSystem);
      expect(vrComp).toBeDefined();
    });

    it('processes multiple VR systems', () => {
      const vr1 = new EntityImpl(createEntityId(), 0);
      vr1.addComponent(createVRSystemComponent('shadow_realm', 'Shadow Realm'));

      const vr2 = new EntityImpl(createEntityId(), 0);
      vr2.addComponent(createVRSystemComponent('feeling_forge', 'Feeling Forge'));

      (harness.world as any)._addEntity(vr1);
      (harness.world as any)._addEntity(vr2);

      system.update(harness.world, [vr1, vr2], 0.05);

      expect(vr1.getComponent(CT.VRSystem)).toBeDefined();
      expect(vr2.getComponent(CT.VRSystem)).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('starts a VR session successfully', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      const vrComp = createVRSystemComponent('shadow_realm', 'Test VR');
      vrEntity.addComponent(vrComp);
      (harness.world as any)._addEntity(vrEntity);

      const session = system.startSession(
        harness.world,
        vrComp,
        ['participant-1'],
        'meditation',
        'A peaceful meditation session'
      );

      expect(session).not.toBeNull();
      expect(session?.participant_ids).toContain('participant-1');
      expect(session?.scenario.type).toBe('meditation');
      expect(session?.scenario.description).toBe('A peaceful meditation session');
      expect(session?.emergency_exit_available).toBe(true);
    });

    it('respects max concurrent sessions limit', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      const vrComp = createVRSystemComponent('shadow_realm', 'Test VR');
      vrComp.max_concurrent_sessions = 2;
      vrEntity.addComponent(vrComp);
      (harness.world as any)._addEntity(vrEntity);

      // Start maximum number of sessions
      system.startSession(harness.world, vrComp, ['p1'], 'test', 'Session 1');
      system.startSession(harness.world, vrComp, ['p2'], 'test', 'Session 2');

      // Try to start one more - should fail
      const failedSession = system.startSession(
        harness.world,
        vrComp,
        ['p3'],
        'test',
        'Session 3'
      );

      expect(failedSession).toBeNull();
      expect(vrComp.active_sessions).toHaveLength(2);
    });

    it('respects max participants per session limit', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      const vrComp = createVRSystemComponent('shadow_realm', 'Test VR');
      vrComp.max_participants_per_session = 1;
      vrEntity.addComponent(vrComp);
      (harness.world as any)._addEntity(vrEntity);

      // Try to start session with too many participants
      const failedSession = system.startSession(
        harness.world,
        vrComp,
        ['p1', 'p2'],
        'test',
        'Too many participants'
      );

      expect(failedSession).toBeNull();
      expect(vrComp.active_sessions).toHaveLength(0);
    });

    it('creates session with target emotion', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      const vrComp = createVRSystemComponent('feeling_forge', 'Emotion Workshop');
      vrEntity.addComponent(vrComp);
      (harness.world as any)._addEntity(vrEntity);

      const targetEmotion = {
        emotions: { joy: 0.8, peace: 0.6 },
      };

      const session = system.startSession(
        harness.world,
        vrComp,
        ['participant-1'],
        'joy_cultivation',
        'Cultivating joyful emotions',
        targetEmotion
      );

      expect(session?.scenario.target_emotion).toEqual(targetEmotion);
    });
  });

  describe('Session Lifecycle', () => {
    it('tracks session duration', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      const vrComp = createVRSystemComponent('shadow_realm', 'Test VR');
      vrEntity.addComponent(vrComp);
      (harness.world as any)._addEntity(vrEntity);

      const session = system.startSession(
        harness.world,
        vrComp,
        ['p1'],
        'test',
        'Test session',
        undefined,
        100 // maxDuration = 100 ticks
      );

      expect(session?.duration).toBe(0);
      expect(session?.max_duration).toBe(100);
    });

    it('ends session after max duration', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      const vrComp = createVRSystemComponent('shadow_realm', 'Test VR');
      vrEntity.addComponent(vrComp);
      (harness.world as any)._addEntity(vrEntity);

      // Start a session with short duration
      system.startSession(
        harness.world,
        vrComp,
        ['p1'],
        'test',
        'Short session',
        undefined,
        1 // maxDuration = 1 tick
      );

      expect(vrComp.active_sessions).toHaveLength(1);

      // Advance world tick past UPDATE_INTERVAL and session duration
      (harness.world as any)._tick = 25; // Past UPDATE_INTERVAL (20) and session duration (1)
      system.update(harness.world, [vrEntity], 0.05);

      // Session should be ended
      expect(vrComp.active_sessions).toHaveLength(0);
    });

    it('allows emergency exit from session', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      const vrComp = createVRSystemComponent('shadow_realm', 'Test VR');
      vrEntity.addComponent(vrComp);
      (harness.world as any)._addEntity(vrEntity);

      const session = system.startSession(
        harness.world,
        vrComp,
        ['p1'],
        'test',
        'Test session'
      );

      expect(vrComp.active_sessions).toHaveLength(1);

      // Emergency exit
      const exitSuccess = system.emergencyExit(
        harness.world,
        vrComp,
        session!.id
      );

      expect(exitSuccess).toBe(true);
      expect(vrComp.active_sessions).toHaveLength(0);
    });

    it('rejects emergency exit for non-existent session', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      const vrComp = createVRSystemComponent('shadow_realm', 'Test VR');
      vrEntity.addComponent(vrComp);
      (harness.world as any)._addEntity(vrEntity);

      const exitSuccess = system.emergencyExit(
        harness.world,
        vrComp,
        'non-existent-session-id'
      );

      expect(exitSuccess).toBe(false);
    });
  });

  describe('Shared Dream Capacity', () => {
    it('allows many participants in shared_dream', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      const vrComp = createVRSystemComponent('shared_dream', 'Collective Dream');
      vrEntity.addComponent(vrComp);
      (harness.world as any)._addEntity(vrEntity);

      const participants = Array.from({ length: 50 }, (_, i) => `p${i}`);

      const session = system.startSession(
        harness.world,
        vrComp,
        participants,
        'collective_experience',
        'A shared collective experience'
      );

      expect(session).not.toBeNull();
      expect(session?.participant_ids).toHaveLength(50);
    });
  });

  describe('Throttling', () => {
    it('throttles updates based on UPDATE_INTERVAL', () => {
      const vrEntity = new EntityImpl(createEntityId(), 0);
      const vrComp = createVRSystemComponent('shadow_realm', 'Test VR');
      vrEntity.addComponent(vrComp);
      (harness.world as any)._addEntity(vrEntity);

      // Start a session
      system.startSession(harness.world, vrComp, ['p1'], 'test', 'Test');

      // Call update multiple times immediately
      system.update(harness.world, [vrEntity], 0.05);
      system.update(harness.world, [vrEntity], 0.05);
      system.update(harness.world, [vrEntity], 0.05);

      // Session should still exist (not ended due to throttling)
      expect(vrComp.active_sessions).toHaveLength(1);
    });
  });
});
