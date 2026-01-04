/**
 * Integration tests for Magic + Body Parts System
 *
 * Tests the integration between:
 * - BodyComponent (extensible body parts)
 * - BodyHealingEffectApplier (healing specific body parts)
 * - BodyTransformEffectApplier (body transformations)
 * - BloodCostCalculator (blood magic with injuries)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import { EventBusImpl } from '../events/EventBus.js';
import { BodySystem } from '../systems/BodySystem.js';
import {
  createBodyComponentFromPlan,
} from '../components/BodyPlanRegistry.js';
import type {
  BodyComponent,
  Injury,
} from '../components/BodyComponent.js';
import {
  getPartsByType,
  getBodyPart,
  calculateTotalPain,
  hasDestroyedVitalParts,
} from '../components/BodyComponent.js';
import {
  BodyHealingEffectApplier,
  mendWoundsEffect,
  cureInfectionEffect,
  mendBoneEffect,
  healArmEffect,
} from '../magic/appliers/BodyHealingEffectApplier.js';
import {
  BodyTransformEffectApplier,
  growWingsEffect,
  extraArmsEffect,
  enhanceArmsEffect,
  enlargeEffect,
  polymorphEffect,
} from '../magic/appliers/BodyTransformEffectApplier.js';
import type { EffectContext } from '../magic/SpellEffectExecutor.js';
import type { Entity } from '../ecs/Entity.js';

describe('Magic + Body Integration Tests', () => {
  let world: WorldImpl;
  let bodySystem: BodySystem;
  let eventBus: EventBusImpl;
  let healingApplier: BodyHealingEffectApplier;
  let transformApplier: BodyTransformEffectApplier;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    bodySystem = new BodySystem();
    healingApplier = new BodyHealingEffectApplier();
    transformApplier = new BodyTransformEffectApplier();
  });

  function createTestEntity(bodyPlanId: string): Entity {
    const entity = world.createEntity();
    const body = createBodyComponentFromPlan(bodyPlanId, 'test_species');
    (entity as any).addComponent(body);
    return entity;
  }

  function createMockContext(tick: number = 0): EffectContext {
    return {
      tick,
      spell: {
        id: 'test_spell',
        name: 'Test Spell',
        technique: 'create',
        form: 'body',
        source: 'arcane',
        manaCost: 50,
        castTime: 1,
        range: 10,
        effectId: 'test_effect',
      },
      scaledValues: new Map([
        ['healing', { value: 100, scaling: 'base' }],
      ]),
      powerMultiplier: 1.0,
      isCrit: false,
      isGroupCast: false,
      casterCount: 1,
    };
  }

  describe('Body Healing Integration', () => {
    it('should heal specific injured body part', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Damage an arm
      const arm = getPartsByType(body, 'arm')[0];
      arm.health = arm.maxHealth * 0.5; // 50% health

      // Add an injury
      const injury: Injury = {
        id: 'cut_1',
        type: 'cut',
        severity: 'moderate',
        bleedRate: 0.5,
        painLevel: 30,
        healingProgress: 0,
        timestamp: 0,
      };
      arm.injuries.push(injury);

      const initialHealth = arm.health;
      const initialPain = calculateTotalPain(body);

      // Apply arm healing spell
      const result = healingApplier.apply(
        healArmEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);
      expect(arm.health).toBeGreaterThan(initialHealth);
      expect(arm.injuries.some(i => i.bleedRate === 0)).toBe(true); // Bleeding stopped
      expect(calculateTotalPain(body)).toBeLessThan(initialPain);
    });

    it('should cure infection on body part', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Infect a leg
      const leg = getPartsByType(body, 'leg')[0];
      leg.infected = true;

      // Apply cure infection spell
      const result = healingApplier.apply(
        cureInfectionEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);
      expect(leg.infected).toBe(false);
    });

    it('should mend fractures instantly', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Add fracture to arm
      const arm = getPartsByType(body, 'arm')[0];
      const fracture: Injury = {
        id: 'fracture_1',
        type: 'fracture',
        severity: 'severe',
        bleedRate: 0,
        painLevel: 60,
        healingProgress: 10,
        timestamp: 0,
      };
      arm.injuries.push(fracture);

      // Apply mend bone spell
      const result = healingApplier.apply(
        mendBoneEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);
      const fractureAfter = arm.injuries.find(i => i.type === 'fracture');
      expect(fractureAfter).toBeDefined();
      expect(fractureAfter?.healingProgress).toBe(100);
      expect(arm.splinted).toBe(true);
    });

    it('should heal multiple wounds across all parts', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Damage multiple parts
      const arm = getPartsByType(body, 'arm')[0];
      const leg = getPartsByType(body, 'leg')[0];
      arm.health = arm.maxHealth * 0.6;
      leg.health = leg.maxHealth * 0.4;

      // Add bleeding injuries
      arm.injuries.push({
        id: 'cut_arm',
        type: 'cut',
        severity: 'moderate',
        bleedRate: 0.3,
        painLevel: 20,
        healingProgress: 0,
        timestamp: 0,
      });

      leg.injuries.push({
        id: 'cut_leg',
        type: 'cut',
        severity: 'severe',
        bleedRate: 0.8,
        painLevel: 50,
        healingProgress: 0,
      });

      // Apply mend wounds (heals all parts)
      const result = healingApplier.apply(
        mendWoundsEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);
      // Check bleeding stopped on both
      expect(arm.injuries[0].bleedRate).toBe(0);
      expect(leg.injuries[0].bleedRate).toBe(0);
    });
  });

  describe('Body Transformation Integration', () => {
    it('should grow wings on humanoid', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Initially no wings
      expect(getPartsByType(body, 'wing')).toHaveLength(0);

      // Apply grow wings spell
      const result = transformApplier.apply(
        growWingsEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);

      // Should now have 2 wings
      const wings = getPartsByType(body, 'wing');
      expect(wings).toHaveLength(2);
      expect(wings[0].functions).toContain('flight');
      expect(body.modifications.length).toBeGreaterThan(0);
    });

    it('should add extra arms to humanoid', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Start with 2 arms
      const initialArmCount = getPartsByType(body, 'arm').length;
      expect(initialArmCount).toBe(2);

      // Apply extra arms spell
      const result = transformApplier.apply(
        extraArmsEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);

      // Should now have 4 arms
      const arms = getPartsByType(body, 'arm');
      expect(arms).toHaveLength(4);
    });

    it('should enhance existing arms', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      const arm = getPartsByType(body, 'arm')[0];
      const initialMaxHealth = arm.maxHealth;
      const initialFunctions = [...arm.functions];

      // Apply enhance arms spell
      const result = transformApplier.apply(
        enhanceArmsEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);

      // Arms should be stronger
      expect(arm.maxHealth).toBeGreaterThan(initialMaxHealth);
      expect(arm.functions).toContain('attack'); // Added attack function
      expect(arm.modifications.length).toBeGreaterThan(0);
    });

    it('should enlarge body size', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      expect(body.size).toBe('medium');

      // Apply enlarge spell
      const result = transformApplier.apply(
        enlargeEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);
      expect(body.size).toBe('large');
      expect(result.appliedValues.oldSize).toBe('medium');
      expect(result.appliedValues.newSize).toBe('large');
    });

    it('should polymorph to different body plan', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      const initialPlanId = body.bodyPlanId;
      expect(initialPlanId).toBe('humanoid_standard');

      // Apply polymorph spell (changes to avian_winged)
      const result = transformApplier.apply(
        polymorphEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);
      expect(body.bodyPlanId).toBe('avian_winged');
      expect(body.bodyPlanId).not.toBe(initialPlanId);

      // Should now have wings
      expect(getPartsByType(body, 'wing')).toHaveLength(2);
    });

    it('should restore original form when transformation expires', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Apply grow wings
      const result = transformApplier.apply(
        growWingsEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);
      expect(getPartsByType(body, 'wing')).toHaveLength(2);

      // Remove transformation
      const activeEffect = {
        effectId: growWingsEffect.id,
        targetId: entity.id,
        appliedValues: result.appliedValues,
        appliedAt: 0,
        remainingDuration: 0,
        casterId: caster.id,
        spellId: 'test_spell',
      };

      transformApplier.remove(activeEffect, growWingsEffect, entity, world);

      // Wings should be removed (body restored)
      expect(getPartsByType(body, 'wing')).toHaveLength(0);
    });
  });

  describe('Multi-Species Body Transformations', () => {
    it('should transform insectoid body correctly', () => {
      const entity = createTestEntity('insectoid_4arm');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Insectoid starts with 4 arms
      expect(getPartsByType(body, 'arm')).toHaveLength(4);

      // Enhance all 4 arms
      const result = transformApplier.apply(
        enhanceArmsEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);

      // All 4 arms should be enhanced
      const arms = getPartsByType(body, 'arm');
      expect(arms).toHaveLength(4);
      arms.forEach(arm => {
        expect(arm.functions).toContain('attack');
        expect(arm.modifications.length).toBeGreaterThan(0);
      });
    });

    it('should heal tentacles on aquatic species', () => {
      const entity = createTestEntity('aquatic_tentacled');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Damage some tentacles
      const tentacles = getPartsByType(body, 'tentacle');
      expect(tentacles.length).toBeGreaterThan(0);

      tentacles[0].health = tentacles[0].maxHealth * 0.3;
      tentacles[1].health = tentacles[1].maxHealth * 0.5;

      // Apply healing
      const result = healingApplier.apply(
        mendWoundsEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);
      expect(tentacles[0].health).toBeGreaterThan(tentacles[0].maxHealth * 0.3);
      expect(tentacles[1].health).toBeGreaterThan(tentacles[1].maxHealth * 0.5);
    });
  });

  describe('Complex Transformation Scenarios', () => {
    it('should handle stacking transformations', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Apply multiple transformations
      transformApplier.apply(growWingsEffect, caster, entity, world, createMockContext(0));
      transformApplier.apply(extraArmsEffect, caster, entity, world, createMockContext(10));
      transformApplier.apply(enhanceArmsEffect, caster, entity, world, createMockContext(20));

      // Should have wings + 4 arms (2 original + 2 extra) enhanced
      expect(getPartsByType(body, 'wing')).toHaveLength(2);
      expect(getPartsByType(body, 'arm')).toHaveLength(4);

      const arms = getPartsByType(body, 'arm');
      arms.forEach(arm => {
        expect(arm.functions).toContain('attack'); // All enhanced
      });

      expect(body.modifications.length).toBeGreaterThanOrEqual(3);
    });

    it('should heal transformed parts', () => {
      const entity = createTestEntity('humanoid_standard');
      const caster = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Grow wings
      transformApplier.apply(growWingsEffect, caster, entity, world, createMockContext());

      // Damage a wing
      const wing = getPartsByType(body, 'wing')[0];
      wing.health = wing.maxHealth * 0.4;

      wing.injuries.push({
        id: 'wing_injury',
        type: 'cut',
        severity: 'severe',
        bleedRate: 0.6,
        painLevel: 40,
        healingProgress: 0,
        timestamp: 0,
      });

      // Heal the wing
      const result = healingApplier.apply(
        mendWoundsEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);
      expect(wing.health).toBeGreaterThan(wing.maxHealth * 0.4);
      expect(wing.injuries[0].bleedRate).toBe(0);
    });
  });

  describe('Blood Magic Integration', () => {
    it('should apply injuries from blood magic cost', () => {
      const entity = createTestEntity('humanoid_standard');
      const body = entity.getComponent('body') as BodyComponent;

      // Simulate blood magic creating injuries
      // (This would be done by BloodCostCalculator in actual system)
      const arm = getPartsByType(body, 'arm')[0];

      const bloodMagicInjury: Injury = {
        id: 'blood_magic_cut',
        type: 'cut',
        severity: 'moderate',
        bleedRate: 0.4,
        painLevel: 25,
        healingProgress: 0,
        timestamp: Date.now(),
      };

      arm.injuries.push(bloodMagicInjury);
      arm.health -= 15;
      body.bloodLoss += 20;

      expect(arm.injuries).toHaveLength(1);
      expect(body.bloodLoss).toBe(20);
      expect(calculateTotalPain(body)).toBeGreaterThan(0);

      // Now heal the blood magic injury
      const caster = createTestEntity('humanoid_standard');
      const result = healingApplier.apply(
        mendWoundsEffect,
        caster,
        entity,
        world,
        createMockContext()
      );

      expect(result.success).toBe(true);
      expect(arm.injuries[0].bleedRate).toBe(0);
    });
  });
});
