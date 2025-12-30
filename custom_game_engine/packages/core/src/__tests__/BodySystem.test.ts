/**
 * Tests for extensible body parts system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import { EventBusImpl } from '../events/EventBus.js';
import { BodySystem } from '../systems/BodySystem.js';
import {
  createBodyComponentFromPlan,
  getAvailableBodyPlans,
  getBodyPlan,
} from '../components/BodyPlanRegistry.js';
import type {
  BodyComponent,
  BodyPart,
  Injury,
  GlobalBodyModification,
} from '../components/BodyComponent.js';
import {
  getSkillDebuff,
  getMovementSpeedMultiplier,
  getPartsByType,
  getPartsByFunction,
  hasDestroyedVitalParts,
  calculateTotalPain,
  calculateOverallHealth,
} from '../components/BodyComponent.js';

describe('BodySystem - Multi-Species Support', () => {
  let world: WorldImpl;
  let bodySystem: BodySystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    bodySystem = new BodySystem();
  });

  describe('Body Plan Creation', () => {
    it('should create standard humanoid body', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');

      expect(body.speciesId).toBe('human');
      expect(body.bodyPlanId).toBe('humanoid_standard');
      expect(body.size).toBe('medium');
      expect(body.bloodType).toBe('red');
      expect(body.skeletonType).toBe('internal');

      // Should have standard humanoid parts
      const partTypes = Object.values(body.parts).map(p => p.type);
      expect(partTypes).toContain('head');
      expect(partTypes).toContain('torso');
      expect(partTypes.filter(t => t === 'arm')).toHaveLength(2);
      expect(partTypes.filter(t => t === 'leg')).toHaveLength(2);
      expect(partTypes.filter(t => t === 'hand')).toHaveLength(2);
      expect(partTypes.filter(t => t === 'foot')).toHaveLength(2);
    });

    it('should create 4-armed insectoid body', () => {
      const body = createBodyComponentFromPlan('insectoid_4arm', 'thrakeen');

      expect(body.speciesId).toBe('thrakeen');
      expect(body.bloodType).toBe('blue');
      expect(body.skeletonType).toBe('exoskeleton');

      // Should have 4 arms
      const arms = getPartsByType(body, 'arm');
      expect(arms).toHaveLength(4);

      // Should have 4 hands (one per arm)
      const hands = getPartsByType(body, 'hand');
      expect(hands).toHaveLength(4);

      // Should have antennae
      const antennae = getPartsByType(body, 'antenna');
      expect(antennae).toHaveLength(2);

      // Should have insectoid body segments
      expect(getPartsByType(body, 'thorax')).toHaveLength(1);
      expect(getPartsByType(body, 'abdomen')).toHaveLength(1);
    });

    it('should create winged avian body', () => {
      const body = createBodyComponentFromPlan('avian_winged', 'angel');

      // Should have wings
      const wings = getPartsByType(body, 'wing');
      expect(wings).toHaveLength(2);
      expect(wings[0].functions).toContain('flight');

      // Should have a tail for balance/flight
      const tail = getPartsByType(body, 'tail');
      expect(tail).toHaveLength(1);
      expect(tail[0].functions).toContain('balance');
      expect(tail[0].functions).toContain('flight');
    });

    it('should create tentacled aquatic body', () => {
      const body = createBodyComponentFromPlan('aquatic_tentacled', 'mindflayer');

      expect(body.skeletonType).toBe('hydrostatic');

      // Should have 8 tentacles
      const tentacles = getPartsByType(body, 'tentacle');
      expect(tentacles).toHaveLength(8);
      expect(tentacles[0].functions).toContain('manipulation');
      expect(tentacles[0].functions).toContain('swimming');

      // Should have gills
      const gills = getPartsByType(body, 'gill');
      expect(gills).toHaveLength(6);
    });

    it('should create celestial winged body', () => {
      const body = createBodyComponentFromPlan('celestial_winged', 'seraph');

      expect(body.bloodType).toBe('ichor');

      // Should have halo (cosmetic)
      const halo = getPartsByType(body, 'halo');
      expect(halo).toHaveLength(1);
      expect(halo[0].functions).toContain('none');

      // Should have wings
      const wings = getPartsByType(body, 'wing');
      expect(wings).toHaveLength(2);
    });

    it('should create demonic horned body', () => {
      const body = createBodyComponentFromPlan('demonic_horned', 'demon');

      expect(body.size).toBe('large');

      // Should have horns for attack
      const horns = getPartsByType(body, 'horn');
      expect(horns).toHaveLength(2);
      expect(horns[0].functions).toContain('attack');

      // Should have claws
      const claws = getPartsByType(body, 'claw');
      expect(claws.length).toBeGreaterThan(0);

      // Should have tail that can attack
      const tail = getPartsByType(body, 'tail');
      expect(tail).toHaveLength(1);
      expect(tail[0].functions).toContain('attack');
    });

    it('should throw error for unknown body plan', () => {
      expect(() => {
        createBodyComponentFromPlan('nonexistent_plan', 'alien');
      }).toThrow(/Unknown body plan/);
    });

    it('should list all available body plans', () => {
      const plans = getAvailableBodyPlans();
      expect(plans).toContain('humanoid_standard');
      expect(plans).toContain('insectoid_4arm');
      expect(plans).toContain('avian_winged');
      expect(plans).toContain('aquatic_tentacled');
      expect(plans).toContain('celestial_winged');
      expect(plans).toContain('demonic_horned');
    });
  });

  describe('Skill Debuffs with Redundancy', () => {
    it('should apply less debuff per arm when having 4 arms', () => {
      const humanBody = createBodyComponentFromPlan('humanoid_standard', 'human');
      const insectBody = createBodyComponentFromPlan('insectoid_4arm', 'thrakeen');

      // Damage one arm on each
      const humanArm = getPartsByType(humanBody, 'arm')[0];
      const insectArm = getPartsByType(insectBody, 'arm')[0];

      humanArm.health = humanArm.maxHealth * 0.5;  // 50% damaged
      insectArm.health = insectArm.maxHealth * 0.5; // 50% damaged

      const humanDebuff = getSkillDebuff(humanBody, 'crafting');
      const insectDebuff = getSkillDebuff(insectBody, 'crafting');

      // Insectoid has 4 arms, so losing 1 arm is less impactful
      expect(insectDebuff).toBeLessThan(humanDebuff);

      // Human has 2 arms, each contributes 0.5/2 = 0.25
      // Insectoid has 4 arms, each contributes 0.5/4 = 0.125
      // With 50% damage: human = 0.125, insectoid = 0.0625
      expect(humanDebuff).toBeCloseTo(0.125, 2);
      expect(insectDebuff).toBeCloseTo(0.0625, 2);
    });

    it('should calculate movement speed based on leg health', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');

      // Full health = 100% speed
      expect(getMovementSpeedMultiplier(body)).toBe(1.0);

      // Damage one leg
      const legs = getPartsByType(body, 'leg');
      legs[0].health = legs[0].maxHealth * 0.5;

      // Speed should be reduced but not halved (still has other leg)
      const speedWith1Leg = getMovementSpeedMultiplier(body);
      expect(speedWith1Leg).toBeGreaterThan(0.5);
      expect(speedWith1Leg).toBeLessThan(1.0);

      // Damage both legs severely
      legs[1].health = legs[1].maxHealth * 0.2;

      // Speed should be much slower but minimum 20%
      const speedWith2BadLegs = getMovementSpeedMultiplier(body);
      expect(speedWith2BadLegs).toBeGreaterThanOrEqual(0.2);
      expect(speedWith2BadLegs).toBeLessThan(speedWith1Leg);
    });

    it('should handle entities with no legs (tentacles for movement)', () => {
      const body = createBodyComponentFromPlan('aquatic_tentacled', 'mindflayer');

      // Tentacles provide locomotion
      const locomotionParts = getPartsByFunction(body, 'swimming');
      expect(locomotionParts.length).toBeGreaterThan(0);
    });
  });

  describe('Injury System', () => {
    it('should track injuries on body parts', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');
      const arm = getPartsByType(body, 'arm')[0];

      const injury: Injury = {
        id: 'injury_1',
        type: 'cut',
        severity: 'moderate',
        bleedRate: 0.5,
        painLevel: 30,
        healingProgress: 0,
        timestamp: 0,
      };

      arm.injuries.push(injury);

      expect(arm.injuries).toHaveLength(1);
      expect(arm.injuries[0].type).toBe('cut');
      expect(arm.injuries[0].bleedRate).toBe(0.5);
    });

    it('should calculate total pain from all injuries', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');

      const arm = getPartsByType(body, 'arm')[0];
      const leg = getPartsByType(body, 'leg')[0];

      arm.injuries.push({
        id: 'injury_1',
        type: 'cut',
        severity: 'moderate',
        bleedRate: 0,
        painLevel: 25,
        healingProgress: 0,
        timestamp: 0,
      });

      leg.injuries.push({
        id: 'injury_2',
        type: 'fracture',
        severity: 'severe',
        bleedRate: 0,
        painLevel: 50,
        healingProgress: 0,
        timestamp: 0,
      });

      const totalPain = calculateTotalPain(body);
      expect(totalPain).toBe(75);
    });

    it('should calculate overall health from all parts', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');

      // All parts at full health
      expect(calculateOverallHealth(body)).toBe(100);

      // Damage one arm
      const arm = getPartsByType(body, 'arm')[0];
      arm.health = arm.maxHealth * 0.5;

      // Overall health should decrease
      const healthAfterDamage = calculateOverallHealth(body);
      expect(healthAfterDamage).toBeLessThan(100);
      expect(healthAfterDamage).toBeGreaterThan(90); // Arm is small % of total
    });
  });

  describe('Vital Parts & Death', () => {
    it('should mark head and torso as vital', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');

      const head = getPartsByType(body, 'head')[0];
      const torso = getPartsByType(body, 'torso')[0];
      const arm = getPartsByType(body, 'arm')[0];

      expect(head.vital).toBe(true);
      expect(torso.vital).toBe(true);
      expect(arm.vital).toBe(false);
    });

    it('should detect destroyed vital parts', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');

      expect(hasDestroyedVitalParts(body)).toBe(false);

      // Destroy head
      const head = getPartsByType(body, 'head')[0];
      head.health = 0;

      expect(hasDestroyedVitalParts(body)).toBe(true);
    });

    it('should allow losing non-vital parts', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');

      // Destroy an arm (non-vital)
      const arm = getPartsByType(body, 'arm')[0];
      arm.health = 0;

      expect(hasDestroyedVitalParts(body)).toBe(false);
    });
  });

  describe('Magic Body Modifications', () => {
    it('should add wings via magic modification', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');

      // Initially no wings
      expect(getPartsByType(body, 'wing')).toHaveLength(0);

      // Add magic modification to grant wings
      const modification: GlobalBodyModification = {
        id: 'divine_wings',
        name: 'Divine Wings',
        source: 'divine',
        effects: {
          partTypeAdded: { type: 'wing', count: 2 },
        },
        permanent: true,
        createdAt: 0,
      };

      body.modifications.push(modification);

      // Manually add wings (system would do this)
      body.parts['wing_divine_0'] = {
        id: 'wing_divine_0',
        type: 'wing',
        name: 'left divine wing',
        vital: false,
        health: 150,
        maxHealth: 150,
        functions: ['flight'],
        affectsSkills: ['exploration'],
        affectsActions: ['fly'],
        injuries: [],
        bandaged: false,
        splinted: false,
        infected: false,
        modifications: [],
      };

      body.parts['wing_divine_1'] = {
        id: 'wing_divine_1',
        type: 'wing',
        name: 'right divine wing',
        vital: false,
        health: 150,
        maxHealth: 150,
        functions: ['flight'],
        affectsSkills: ['exploration'],
        affectsActions: ['fly'],
        injuries: [],
        bandaged: false,
        splinted: false,
        infected: false,
        modifications: [],
      };

      expect(getPartsByType(body, 'wing')).toHaveLength(2);
    });

    it('should track temporary vs permanent modifications', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');

      const permanentMod: GlobalBodyModification = {
        id: 'perm_mod',
        name: 'Permanent Mutation',
        source: 'genetic',
        effects: {
          skillModifier: { strength: 10 },
        },
        permanent: true,
        createdAt: 0,
      };

      const temporaryMod: GlobalBodyModification = {
        id: 'temp_mod',
        name: 'Temporary Spell',
        source: 'magic',
        effects: {
          skillModifier: { speed: 20 },
        },
        permanent: false,
        duration: 100,  // 100 ticks
        createdAt: 0,
      };

      body.modifications.push(permanentMod, temporaryMod);

      expect(body.modifications).toHaveLength(2);
      expect(body.modifications.filter(m => m.permanent)).toHaveLength(1);
      expect(body.modifications.filter(m => !m.permanent)).toHaveLength(1);
    });
  });

  describe('Species-Specific Features', () => {
    it('should have different blood types for different species', () => {
      const human = createBodyComponentFromPlan('humanoid_standard', 'human');
      const insect = createBodyComponentFromPlan('insectoid_4arm', 'thrakeen');
      const divine = createBodyComponentFromPlan('celestial_winged', 'angel');

      expect(human.bloodType).toBe('red');
      expect(insect.bloodType).toBe('blue');
      expect(divine.bloodType).toBe('ichor');
    });

    it('should have different skeleton types', () => {
      const human = createBodyComponentFromPlan('humanoid_standard', 'human');
      const insect = createBodyComponentFromPlan('insectoid_4arm', 'thrakeen');
      const aquatic = createBodyComponentFromPlan('aquatic_tentacled', 'mindflayer');

      expect(human.skeletonType).toBe('internal');
      expect(insect.skeletonType).toBe('exoskeleton');
      expect(aquatic.skeletonType).toBe('hydrostatic');
    });

    it('should assign skills based on body part functions', () => {
      const body = createBodyComponentFromPlan('humanoid_standard', 'human');

      const hands = getPartsByType(body, 'hand');
      expect(hands[0].affectsSkills).toContain('crafting');
      expect(hands[0].affectsSkills).toContain('building');

      const legs = getPartsByType(body, 'leg');
      expect(legs[0].affectsSkills).toContain('exploration');
    });
  });

  describe('Body Plan Registry', () => {
    it('should retrieve body plan template', () => {
      const plan = getBodyPlan('humanoid_standard');

      expect(plan).toBeDefined();
      expect(plan?.id).toBe('humanoid_standard');
      expect(plan?.name).toBe('Standard Humanoid');
      expect(plan?.baseType).toBe('humanoid');
    });

    it('should return undefined for unknown plan', () => {
      const plan = getBodyPlan('unknown_plan');
      expect(plan).toBeUndefined();
    });
  });
});
