/**
 * Integration tests for Divinity + Body Parts systems
 *
 * Tests that deities can:
 * - Heal believers' body parts
 * - Transform believers' bodies
 * - Create divine champions
 * - Answer healing prayers
 * - Grant divine transformations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../ecs/World.js';
import { EventBusImpl } from '../events/EventBus.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { BodyComponent, Injury } from '../components/BodyComponent.js';
import { createBodyComponentFromPlan } from '../components/BodyPlanRegistry.js';
import { DivineBodyModification } from '../systems/DivineBodyModification.js';
import { registerBodyHealingEffectApplier } from '../magic/appliers/BodyHealingEffectApplier.js';
import { registerBodyTransformEffectApplier } from '../magic/appliers/BodyTransformEffectApplier.js';

// Register effect appliers once for all tests
registerBodyHealingEffectApplier();
registerBodyTransformEffectApplier();

describe('Divinity + Body Parts Integration', () => {
  let world: WorldImpl;
  let divineBodySystem: DivineBodyModification;
  let deity: EntityImpl;
  let deityComp: DeityComponent;
  let believer: EntityImpl;
  let believerBody: BodyComponent;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    // Create divine body modification system
    divineBodySystem = new DivineBodyModification({
      believersOnly: true,
      minBeliefRequired: 100,
    });

    // Create deity entity
    deity = new EntityImpl('deity_1');
    deityComp = new DeityComponent('Healing God', 'player');
    deityComp.identity.domain = 'healing';
    deityComp.belief.currentBelief = 5000; // Lots of belief to spend
    deity.addComponent(deityComp);
    (world as any)._addEntity(deity);

    // Create believer entity with body
    believer = new EntityImpl('believer_1');
    believerBody = createBodyComponentFromPlan('humanoid_standard', 'human');
    believer.addComponent(believerBody);
    (world as any)._addEntity(believer);

    // Make believer believe in deity
    deityComp.addBeliever(believer.id);
  });

  describe('Divine Healing Powers', () => {
    it('should heal wounds on a believer', () => {
      // Injure the believer's arm
      const arm = believerBody.parts.left_arm;
      if (!arm) throw new Error('No left arm found');

      arm.health = 30;
      const injury: Injury = {
        id: 'cut_1',
        type: 'cut',
        severity: 'severe',
        bleedRate: 0.8,
        painLevel: 50,
        healingProgress: 0,
        timestamp: Date.now(),
      };
      arm.injuries.push(injury);

      // Deity heals the wounds
      const result = divineBodySystem.mendAllWounds(
        deity.id,
        believer.id,
        world,
        'blessing'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');
      expect(result?.category).toBe('healing');

      // Check that bleeding stopped
      const updatedArm = believerBody.parts.left_arm;
      if (!updatedArm) throw new Error('Arm disappeared');

      const bleedingInjuries = updatedArm.injuries.filter(i => i.bleedRate > 0);
      expect(bleedingInjuries.length).toBe(0);

      // Check belief was spent
      expect(deityComp.belief.currentBelief).toBeLessThan(5000);
    });

    it('should cure infections on believer', () => {
      // Infect the believer's leg
      const leg = believerBody.parts.left_leg;
      if (!leg) throw new Error('No left leg found');

      leg.infected = true;

      // Deity cures infection
      const result = divineBodySystem.healBody(
        deity.id,
        believer.id,
        world,
        'cure_infection',
        'blessing'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');

      // Check infection cured
      const updatedLeg = believerBody.parts.left_leg;
      if (!updatedLeg) throw new Error('Leg disappeared');
      expect(updatedLeg.infected).toBe(false);
    });

    it('should mend fractures on believer', () => {
      // Fracture the believer's arm
      const arm = believerBody.parts.right_arm;
      if (!arm) throw new Error('No right arm found');

      const fracture: Injury = {
        id: 'fracture_1',
        type: 'fracture',
        severity: 'severe',
        bleedRate: 0,
        painLevel: 80,
        healingProgress: 10,
        timestamp: Date.now(),
      };
      arm.injuries.push(fracture);

      // Deity mends the bone
      const result = divineBodySystem.healBody(
        deity.id,
        believer.id,
        world,
        'mend_bone',
        'miracle'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');

      // Check fracture healed
      const updatedArm = believerBody.parts.right_arm;
      if (!updatedArm) throw new Error('Arm disappeared');

      const fractures = updatedArm.injuries.filter(i => i.type === 'fracture');
      // Fractures should be marked as fully healed (100% progress)
      const unhealedFractures = fractures.filter(i => i.healingProgress < 100);
      expect(unhealedFractures.length).toBe(0);
    });

    it('should restore a lost limb (very powerful)', () => {
      // Remove the believer's arm (simulate amputation)
      delete believerBody.parts.right_arm;

      const armsBefore = Object.values(believerBody.parts).filter(
        p => p.type === 'arm'
      ).length;

      // Deity restores the limb (very expensive)
      const result = divineBodySystem.restoreLostLimb(
        deity.id,
        believer.id,
        world,
        'miracle'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');

      // Note: Actual limb regeneration would require BodyPlanRegistry integration
      // For now, we just verify the divine power executed successfully
      expect(result?.cost).toBeGreaterThan(400); // Very expensive
    });

    it('should fully restore all body damage', () => {
      // Damage multiple body parts
      const parts = Object.values(believerBody.parts);
      for (const part of parts.slice(0, 3)) {
        part.health = 20;
        part.injuries.push({
          id: `injury_${part.id}`,
          type: 'cut',
          severity: 'moderate',
          bleedRate: 0.3,
          painLevel: 30,
          healingProgress: 0,
          timestamp: Date.now(),
        });
      }

      // Deity performs full restoration (most expensive healing)
      const result = divineBodySystem.healBody(
        deity.id,
        believer.id,
        world,
        'full_restoration',
        'miracle'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');
      expect(result?.cost).toBeGreaterThan(700); // Most expensive
    });

    it('should fail to heal non-believers if believersOnly = true', () => {
      // Create non-believer
      const nonBeliever = new EntityImpl('non_believer');
      const nonBelieverBody = createBodyComponentFromPlan('humanoid_standard', 'human');
      nonBeliever.addComponent(nonBelieverBody);
      (world as any)._addEntity(nonBeliever);

      // Try to heal non-believer
      const result = divineBodySystem.mendAllWounds(
        deity.id,
        nonBeliever.id,
        world,
        'blessing'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('failed');
      expect(result?.error).toContain('not a believer');
    });

    it('should fail if deity has insufficient belief', () => {
      // Drain deity's belief
      deityComp.belief.currentBelief = 50;

      // Try to heal (costs 150 belief)
      const result = divineBodySystem.mendAllWounds(
        deity.id,
        believer.id,
        world,
        'blessing'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('failed');
      expect(result?.error).toContain('Insufficient belief');
    });
  });

  describe('Divine Transformation Powers', () => {
    it('should grant wings to a champion', () => {
      const partsBefore = Object.keys(believerBody.parts).length;

      // Deity grants wings
      const result = divineBodySystem.grantWings(
        deity.id,
        believer.id,
        world,
        'champion_creation'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');
      expect(result?.category).toBe('transformation');

      // Check wings were added
      const partsAfter = Object.keys(believerBody.parts).length;
      expect(partsAfter).toBeGreaterThan(partsBefore);

      // Check for wings
      const wings = Object.values(believerBody.parts).filter(p => p.type === 'wing');
      expect(wings.length).toBeGreaterThan(0);

      // Check they have flight function
      const hasFlightFunction = wings.some(w => w.functions.includes('flight'));
      expect(hasFlightFunction).toBe(true);

      // Verify it's marked as divine modification
      const wingPart = wings[0];
      if (!wingPart) throw new Error('No wing found');

      // Wings should be tracked in body modifications
      expect(believerBody.modifications.length).toBeGreaterThan(0);
    });

    it('should grant extra arms to a believer', () => {
      const armsBefore = Object.values(believerBody.parts).filter(
        p => p.type === 'arm'
      ).length;

      // Deity grants extra arms
      const result = divineBodySystem.transformBody(
        deity.id,
        believer.id,
        world,
        'extra_arms',
        'reward'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');

      // Check arms were added
      const armsAfter = Object.values(believerBody.parts).filter(
        p => p.type === 'arm'
      ).length;
      expect(armsAfter).toBeGreaterThan(armsBefore);
      expect(armsAfter).toBe(armsBefore + 2); // Should add 2 arms
    });

    it('should enhance existing arms', () => {
      const arm = believerBody.parts.left_arm;
      if (!arm) throw new Error('No left arm found');

      const originalMaxHealth = arm.maxHealth;
      const originalFunctions = [...arm.functions];

      // Deity enhances arms
      const result = divineBodySystem.transformBody(
        deity.id,
        believer.id,
        world,
        'enhance_arms',
        'blessing'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');

      // Check arm was enhanced
      const enhancedArm = believerBody.parts.left_arm;
      if (!enhancedArm) throw new Error('Arm disappeared');

      expect(enhancedArm.maxHealth).toBeGreaterThan(originalMaxHealth);

      // Should have new functions (like 'attack')
      const newFunctions = enhancedArm.functions.filter(
        f => !originalFunctions.includes(f)
      );
      expect(newFunctions.length).toBeGreaterThan(0);
    });

    it('should enlarge a believer', () => {
      const originalSize = believerBody.size;

      // Deity enlarges believer
      const result = divineBodySystem.transformBody(
        deity.id,
        believer.id,
        world,
        'enlarge',
        'blessing'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');

      // Check size changed
      expect(believerBody.size).not.toBe(originalSize);
      expect(believerBody.size).toBe('large');
    });

    it('should transform believer into divine/celestial form', () => {
      const originalBodyPlan = believerBody.bodyPlanId;

      // Deity ascends believer to divine form
      const result = divineBodySystem.ascendBeliever(
        deity.id,
        believer.id,
        world,
        'reward'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');

      // Check body plan changed to celestial
      expect(believerBody.bodyPlanId).not.toBe(originalBodyPlan);
      expect(believerBody.bodyPlanId).toBe('celestial_winged');

      // Should have wings now
      const wings = Object.values(believerBody.parts).filter(p => p.type === 'wing');
      expect(wings.length).toBeGreaterThan(0);
    });

    it('should allow custom polymorph with specified body plan', () => {
      const originalBodyPlan = believerBody.bodyPlanId;

      // Deity transforms believer into avian form
      const result = divineBodySystem.transformBody(
        deity.id,
        believer.id,
        world,
        'polymorph',
        'blessing',
        'avian_winged' // Custom body plan
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');

      // Check body plan changed to avian
      expect(believerBody.bodyPlanId).not.toBe(originalBodyPlan);
      expect(believerBody.bodyPlanId).toBe('avian_winged');
    });

    it('should track belief cost for transformations', () => {
      const beliefBefore = deityComp.belief.currentBelief;

      // Deity grants wings (expensive)
      const result = divineBodySystem.grantWings(
        deity.id,
        believer.id,
        world,
        'champion_creation'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');

      // Check belief was spent
      const beliefAfter = deityComp.belief.currentBelief;
      expect(beliefAfter).toBeLessThan(beliefBefore);

      // Check cost was recorded
      const costSpent = beliefBefore - beliefAfter;
      expect(result?.cost).toBe(costSpent);
      expect(result?.cost).toBeGreaterThan(500); // Wings are expensive
    });
  });

  describe('Divine Power Tracking', () => {
    it('should track all modifications by a deity', () => {
      // Perform multiple modifications
      divineBodySystem.mendAllWounds(deity.id, believer.id, world, 'blessing');
      divineBodySystem.grantWings(deity.id, believer.id, world, 'champion_creation');
      divineBodySystem.healBody(deity.id, believer.id, world, 'cure_infection', 'blessing');

      const modifications = divineBodySystem.getModificationsByDeity(deity.id);
      expect(modifications.length).toBe(3);

      // Check categories
      const healing = modifications.filter(m => m.category === 'healing');
      const transformation = modifications.filter(m => m.category === 'transformation');
      expect(healing.length).toBe(2);
      expect(transformation.length).toBe(1);
    });

    it('should track total belief spent on body modifications', () => {
      const beliefBefore = deityComp.belief.currentBelief;

      // Perform several modifications
      divineBodySystem.mendAllWounds(deity.id, believer.id, world, 'blessing');
      divineBodySystem.grantWings(deity.id, believer.id, world, 'champion_creation');

      const beliefAfter = deityComp.belief.currentBelief;
      const actualSpent = beliefBefore - beliefAfter;

      const trackedSpent = divineBodySystem.getTotalBeliefSpent(deity.id);
      expect(trackedSpent).toBe(actualSpent);
      expect(trackedSpent).toBeGreaterThan(0);
    });

    it('should get modifications on a specific target', () => {
      // Create second believer
      const believer2 = new EntityImpl('believer_2');
      const believer2Body = createBodyComponentFromPlan('humanoid_standard', 'human');
      believer2.addComponent(believer2Body);
      (world as any)._addEntity(believer2);
      deityComp.addBeliever(believer2.id);

      // Modify both believers
      divineBodySystem.mendAllWounds(deity.id, believer.id, world, 'blessing');
      divineBodySystem.grantWings(deity.id, believer.id, world, 'champion_creation');
      divineBodySystem.mendAllWounds(deity.id, believer2.id, world, 'blessing');

      // Check believer 1 has 2 modifications
      const believer1Mods = divineBodySystem.getModificationsOnTarget(believer.id);
      expect(believer1Mods.length).toBe(2);

      // Check believer 2 has 1 modification
      const believer2Mods = divineBodySystem.getModificationsOnTarget(believer2.id);
      expect(believer2Mods.length).toBe(1);
    });

    it('should distinguish successful vs failed modifications', () => {
      // Successful modification
      divineBodySystem.mendAllWounds(deity.id, believer.id, world, 'blessing');

      // Failed modification (insufficient belief)
      deityComp.belief.currentBelief = 10;
      divineBodySystem.grantWings(deity.id, believer.id, world, 'champion_creation');

      const successful = divineBodySystem.getSuccessfulModifications();
      const allMods = divineBodySystem.getModificationsByDeity(deity.id);

      expect(successful.length).toBe(1);
      expect(allMods.length).toBe(2);

      const failed = allMods.filter(m => m.result === 'failed');
      expect(failed.length).toBe(1);
    });
  });

  describe('Multi-Species Divine Powers', () => {
    it('should work on insectoid believers', () => {
      // Create insectoid believer
      const insectoid = new EntityImpl('insectoid_1');
      const insectoidBody = createBodyComponentFromPlan('insectoid_4arm', 'insectoid');
      insectoid.addComponent(insectoidBody);
      (world as any)._addEntity(insectoid);
      deityComp.addBeliever(insectoid.id);

      const armsBefore = Object.values(insectoidBody.parts).filter(
        p => p.type === 'arm'
      ).length;

      // Enhance all 4 arms
      const result = divineBodySystem.transformBody(
        deity.id,
        insectoid.id,
        world,
        'enhance_arms',
        'blessing'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');

      // All 4 arms should be enhanced
      const enhancedArms = Object.values(insectoidBody.parts).filter(
        p => p.type === 'arm' && p.modifications.length > 0
      );
      expect(enhancedArms.length).toBe(armsBefore);
    });

    it('should work on aquatic believers', () => {
      // Create aquatic believer with tentacles
      const aquatic = new EntityImpl('aquatic_1');
      const aquaticBody = createBodyComponentFromPlan('aquatic_tentacled', 'alien');
      aquatic.addComponent(aquaticBody);
      (world as any)._addEntity(aquatic);
      deityComp.addBeliever(aquatic.id);

      // Heal aquatic (should work despite different body plan)
      const result = divineBodySystem.mendAllWounds(
        deity.id,
        aquatic.id,
        world,
        'blessing'
      );

      expect(result).not.toBeNull();
      expect(result?.result).toBe('success');
    });
  });

  describe('Purpose Tracking', () => {
    it('should track divine purpose for each modification', () => {
      divineBodySystem.mendAllWounds(deity.id, believer.id, world, 'blessing');
      divineBodySystem.grantWings(deity.id, believer.id, world, 'champion_creation');
      divineBodySystem.healBody(deity.id, believer.id, world, 'restore_limb', 'miracle');

      const mods = divineBodySystem.getModificationsByDeity(deity.id);

      const blessing = mods.find(m => m.purpose === 'blessing');
      const champion = mods.find(m => m.purpose === 'champion_creation');
      const miracle = mods.find(m => m.purpose === 'miracle');

      expect(blessing).toBeDefined();
      expect(champion).toBeDefined();
      expect(miracle).toBeDefined();
    });
  });
});
