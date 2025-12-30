import { ComponentType } from '../../types/ComponentType.js';
/**
 * Unit tests for Decision Module
 *
 * Tests AutonomicSystem, BehaviorPriority, and ScriptedDecisionProcessor classes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { AutonomicSystem } from '../AutonomicSystem.js';
import {
  getBehaviorPriority,
  getBehaviorPriorityConfig,
  canInterrupt,
  isCriticalSurvivalBehavior,
} from '../BehaviorPriority.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';

describe('AutonomicSystem', () => {
  let autonomicSystem: AutonomicSystem;

  beforeEach(() => {
    autonomicSystem = new AutonomicSystem();
  });

  describe('checkNeeds', () => {
    it('returns forced_sleep when energy is 0', () => {
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0;

      const result = autonomicSystem.checkNeeds(needs);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('forced_sleep');
      expect(result!.priority).toBe(100);
    });

    it('returns seek_sleep when energy is below 10', () => {
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 5;

      const result = autonomicSystem.checkNeeds(needs);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('seek_sleep');
      expect(result!.priority).toBe(85);
    });

    it('returns forced_sleep when sleepDrive exceeds 85', () => {
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 50; // Healthy energy

      const circadian = createCircadianComponent();
      circadian.sleepDrive = 90;

      const result = autonomicSystem.checkNeeds(needs, circadian);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('forced_sleep');
    });

    it('returns seek_warmth when dangerously cold', () => {
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 50;

      const temperature = {
        type: ComponentType.Temperature,
        currentTemp: -5,
        comfortMin: 15,
        comfortMax: 25,
        state: 'dangerously_cold' as const,
      };

      const result = autonomicSystem.checkNeeds(needs, undefined, temperature);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('seek_warmth');
      expect(result!.priority).toBe(90);
    });

    it('returns seek_warmth when cold and below comfort threshold', () => {
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 50;

      const temperature = {
        type: ComponentType.Temperature,
        currentTemp: 10,
        comfortMin: 15,
        comfortMax: 25,
        state: 'cold' as const,
      };

      const result = autonomicSystem.checkNeeds(needs, undefined, temperature);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('seek_warmth');
      expect(result!.priority).toBe(35);
    });

    it('returns seek_food when critically hungry', () => {
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 50;
      needs.hunger = 5; // Critical hunger

      const result = autonomicSystem.checkNeeds(needs);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('seek_food');
      expect(result!.priority).toBe(80);
    });

    it('returns forced_sleep when sleepDrive > 85', () => {
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 50;

      const circadian = createCircadianComponent();
      circadian.sleepDrive = 90; // Above 85 threshold

      const result = autonomicSystem.checkNeeds(needs, circadian);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('forced_sleep');
    });

    it('returns seek_food for moderate hunger', () => {
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 50;
      needs.hunger = 40; // Moderate hunger

      const result = autonomicSystem.checkNeeds(needs);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('seek_food');
      expect(result!.priority).toBe(40);
    });

    it('returns null when no autonomic override needed', () => {
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 80;
      needs.hunger = 80;

      const result = autonomicSystem.checkNeeds(needs);

      expect(result).toBeNull();
    });
  });

  describe('isCriticalBehavior', () => {
    it('returns true for forced_sleep', () => {
      expect(autonomicSystem.isCriticalBehavior('forced_sleep')).toBe(true);
    });

    it('returns true for flee_danger', () => {
      expect(autonomicSystem.isCriticalBehavior('flee_danger')).toBe(true);
    });

    it('returns false for wander', () => {
      expect(autonomicSystem.isCriticalBehavior('wander')).toBe(false);
    });

    it('returns false for gather', () => {
      expect(autonomicSystem.isCriticalBehavior('gather')).toBe(false);
    });
  });

  describe('check', () => {
    it('returns null when entity has no needs component', () => {
      const entity = new EntityImpl(createEntityId(), 0);

      const result = autonomicSystem.check(entity);

      expect(result).toBeNull();
    });

    it('returns result when entity has needs and energy is low', () => {
      const entity = new EntityImpl(createEntityId(), 0);
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0;
      entity.addComponent(needs);

      const result = autonomicSystem.check(entity);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('forced_sleep');
    });
  });
});

describe('BehaviorPriority', () => {
  describe('getBehaviorPriority', () => {
    it('returns 100 for forced_sleep', () => {
      expect(getBehaviorPriority('forced_sleep')).toBe(100);
    });

    it('returns 95 for flee', () => {
      expect(getBehaviorPriority('flee')).toBe(95);
    });

    it('returns 60 for deposit_items', () => {
      expect(getBehaviorPriority('deposit_items')).toBe(60);
    });

    it('returns 55 for build', () => {
      expect(getBehaviorPriority('build')).toBe(55);
    });

    it('returns 15 for gather', () => {
      expect(getBehaviorPriority('gather')).toBe(15);
    });

    it('returns 5 for wander', () => {
      expect(getBehaviorPriority('wander')).toBe(5);
    });

    it('returns 0 for idle', () => {
      expect(getBehaviorPriority('idle')).toBe(0);
    });

    it('returns 10 for unknown behaviors', () => {
      expect(getBehaviorPriority('unknown_behavior' as any)).toBe(10);
    });

    it('returns 90 for seek_warmth when dangerously cold', () => {
      const temperature = {
        type: ComponentType.Temperature,
        currentTemp: -5,
        comfortMin: 15,
        comfortMax: 25,
        state: 'dangerously_cold' as const,
      };

      expect(getBehaviorPriority('seek_warmth', temperature)).toBe(90);
    });

    it('returns 35 for seek_warmth when just cold', () => {
      const temperature = {
        type: ComponentType.Temperature,
        currentTemp: 12,
        comfortMin: 15,
        comfortMax: 25,
        state: 'cold' as const,
      };

      expect(getBehaviorPriority('seek_warmth', temperature)).toBe(35);
    });
  });

  describe('getBehaviorPriorityConfig', () => {
    it('returns canBeInterrupted=false for forced_sleep', () => {
      const config = getBehaviorPriorityConfig('forced_sleep');
      expect(config.canBeInterrupted).toBe(false);
    });

    it('returns canBeInterrupted=true for gather', () => {
      const config = getBehaviorPriorityConfig('gather');
      expect(config.canBeInterrupted).toBe(true);
    });

    it('returns interruptsOthers=true for seek_food', () => {
      const config = getBehaviorPriorityConfig('seek_food');
      expect(config.interruptsOthers).toBe(true);
    });

    it('returns interruptsOthers=false for wander', () => {
      const config = getBehaviorPriorityConfig('wander');
      expect(config.interruptsOthers).toBe(false);
    });
  });

  describe('canInterrupt', () => {
    it('forced_sleep cannot be interrupted', () => {
      expect(canInterrupt('seek_food', 'forced_sleep')).toBe(false);
      expect(canInterrupt('gather', 'forced_sleep')).toBe(false);
    });

    it('higher priority can interrupt lower', () => {
      expect(canInterrupt('seek_food', 'wander')).toBe(true);
      expect(canInterrupt('seek_food', 'gather')).toBe(true);
    });

    it('lower priority cannot interrupt higher', () => {
      expect(canInterrupt('wander', 'seek_food')).toBe(false);
      expect(canInterrupt('gather', 'build')).toBe(false);
    });

    it('wander cannot interrupt anything (interruptsOthers=false)', () => {
      expect(canInterrupt('wander', 'idle')).toBe(false);
    });
  });

  describe('isCriticalSurvivalBehavior', () => {
    it('returns true for forced_sleep', () => {
      expect(isCriticalSurvivalBehavior('forced_sleep')).toBe(true);
    });

    it('returns true for flee', () => {
      expect(isCriticalSurvivalBehavior('flee')).toBe(true);
    });

    it('returns false for seek_food', () => {
      expect(isCriticalSurvivalBehavior('seek_food')).toBe(false);
    });
  });
});
