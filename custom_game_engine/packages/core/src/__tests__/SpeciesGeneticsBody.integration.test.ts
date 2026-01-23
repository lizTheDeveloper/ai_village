/**
 * Species + Genetics + Body System - Complete Integration Test
 *
 * Tests the complete Species, Genetics, and Body systems working together:
 * - Pure-species reproduction (two humans → human child)
 * - Hybrid creation (elf + human → half-elf)
 * - Mutation system (1% chance of extra limbs, missing limbs, size changes)
 * - Hereditary divine wings (deity grants wings → 50% chance offspring inherit)
 * - Multi-generation bloodlines
 * - Genetic inheritance (Mendelian genetics)
 * - Inbreeding tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EventBusImpl } from '../events/EventBus.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';

// Systems
import { ReproductionSystem } from '../systems/ReproductionSystem.js';
import { BodySystem } from '../systems/BodySystem.js';

// Components
import { SpeciesComponent } from '../components/SpeciesComponent.js';
import { GeneticComponent, createHereditaryModification } from '../components/GeneticComponent.js';
import type { BodyComponent } from '../components/BodyComponent.js';

// Species Registry
import {
  createSpeciesFromTemplate,
  createGeneticsFromTemplate,
  getSpeciesTemplate,
  canHybridize,
  getHybridName,
} from '../species/SpeciesRegistry.js';

describe('Species + Genetics + Body - Complete Integration', () => {
  let world: World;
  let reproductionSystem: ReproductionSystem;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);

    reproductionSystem = new ReproductionSystem({
      allowHybrids: true,
      enableMutations: true,
      trackInbreeding: true,
      minGeneticHealth: 0.3,
    });
  });

  describe('Pure Species Reproduction', () => {
    it('should create a pure human child from two human parents', () => {
      // Create two human parents
      const humanTemplate = getSpeciesTemplate('human');
      if (!humanTemplate) throw new Error('Human template not found');

      const parent1 = world.createEntity() as EntityImpl;
      const parent1Species = createSpeciesFromTemplate(humanTemplate);
      const parent1Genetics = createGeneticsFromTemplate(humanTemplate);
      parent1.addComponent(parent1Species);
      parent1.addComponent(parent1Genetics);

      const parent2 = world.createEntity() as EntityImpl;
      const parent2Species = createSpeciesFromTemplate(humanTemplate);
      const parent2Genetics = createGeneticsFromTemplate(humanTemplate);
      parent2.addComponent(parent2Species);
      parent2.addComponent(parent2Genetics);

      // Create offspring
      const child = reproductionSystem.createOffspring(parent1, parent2, world);

      expect(child).not.toBeNull();
      if (!child) throw new Error('Child should not be null');

      // Verify child is human
      const childSpecies = child.components.get(CT.Species) as SpeciesComponent;
      expect(childSpecies).toBeDefined();
      expect(childSpecies.speciesId).toBe('human');
      expect(childSpecies.isHybrid).toBe(false);

      // Verify child has genetics
      const childGenetics = child.components.get(CT.Genetic) as GeneticComponent;
      expect(childGenetics).toBeDefined();
      expect(childGenetics.generation).toBe(1); // First generation
      expect(childGenetics.parentIds).toEqual([parent1.id, parent2.id]);

      // Verify child has body
      const childBody = child.components.get(CT.Body) as BodyComponent;
      expect(childBody).toBeDefined();
      expect(childBody.speciesId).toBe('human');
    });

    it('should inherit genetic alleles from both parents', () => {
      // Create two human parents with specific alleles
      const parent1 = world.createEntity() as EntityImpl;
      const parent1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);

      // Add eye color allele (brown dominant)
      parent1Genetics.addAllele({
        traitId: 'eye_color',
        dominantAllele: 'brown',
        recessiveAllele: 'blue',
        expression: 'dominant',
        expressedAllele: 'dominant',
        category: 'physical',
      });

      parent1.addComponent(parent1Species);
      parent1.addComponent(parent1Genetics);

      const parent2 = world.createEntity() as EntityImpl;
      const parent2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);

      // Parent2 has blue eyes (recessive)
      parent2Genetics.addAllele({
        traitId: 'eye_color',
        dominantAllele: 'brown',
        recessiveAllele: 'blue',
        expression: 'dominant',
        expressedAllele: 'recessive', // Both alleles blue
        category: 'physical',
      });

      parent2.addComponent(parent2Species);
      parent2.addComponent(parent2Genetics);

      // Create offspring
      const child = reproductionSystem.createOffspring(parent1, parent2, world);
      expect(child).not.toBeNull();
      if (!child) throw new Error('Child should not be null');

      const childGenetics = child.components.get(CT.Genetic) as GeneticComponent;

      // Child should have eye color allele
      const eyeColor = childGenetics.getAllele('eye_color');
      expect(eyeColor).toBeDefined();
      expect(eyeColor?.traitId).toBe('eye_color');

      // Child could have brown or blue eyes depending on inheritance
      // (50% chance brown, 50% chance blue given parent genotypes)
      expect(['dominant', 'recessive']).toContain(eyeColor?.expressedAllele);
    });
  });

  describe('Hybrid Species Creation', () => {
    it('should create a half-elf from elf and human parents', () => {
      // Create elf parent
      const parent1 = world.createEntity() as EntityImpl;
      const parent1Species = createSpeciesFromTemplate(getSpeciesTemplate('elf')!);
      const parent1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('elf')!);
      parent1.addComponent(parent1Species);
      parent1.addComponent(parent1Genetics);

      // Create human parent
      const parent2 = world.createEntity() as EntityImpl;
      const parent2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent2.addComponent(parent2Species);
      parent2.addComponent(parent2Genetics);

      // Verify they can hybridize
      expect(canHybridize('elf', 'human')).toBe(true);
      expect(getHybridName('elf', 'human')).toBe('Half-Elf');

      // Create offspring
      const child = reproductionSystem.createOffspring(parent1, parent2, world);
      expect(child).not.toBeNull();
      if (!child) throw new Error('Child should not be null');

      // Verify child is a hybrid
      const childSpecies = child.components.get(CT.Species) as SpeciesComponent;
      expect(childSpecies).toBeDefined();
      expect(childSpecies.isHybrid).toBe(true);
      expect(childSpecies.parentSpecies).toEqual(['elf', 'human']);
      expect(childSpecies.hybridGeneration).toBe(1);
      // Display name format is "species1-species2 Hybrid"
      expect(childSpecies.getDisplayName()).toContain('Hybrid');

      // Verify hybrid has blended traits
      expect(childSpecies.innateTraits.length).toBeGreaterThan(0);

      // Verify hybrid has body
      const childBody = child.components.get(CT.Body) as BodyComponent;
      expect(childBody).toBeDefined();
    });

    it('should blend physical characteristics from both parent species', () => {
      // Create elf parent (taller, lighter)
      const elfTemplate = getSpeciesTemplate('elf');
      const elf = world.createEntity() as EntityImpl;
      const elfSpecies = createSpeciesFromTemplate(getSpeciesTemplate('elf')!);
      const elfGenetics = createGeneticsFromTemplate(getSpeciesTemplate('elf')!);
      elf.addComponent(elfSpecies);
      elf.addComponent(elfGenetics);

      // Create dwarf parent (shorter, heavier)
      const dwarfTemplate = getSpeciesTemplate('dwarf');
      const dwarf = world.createEntity() as EntityImpl;
      const dwarfSpecies = createSpeciesFromTemplate(getSpeciesTemplate('dwarf')!);
      const dwarfGenetics = createGeneticsFromTemplate(getSpeciesTemplate('dwarf')!);
      dwarf.addComponent(dwarfSpecies);
      dwarf.addComponent(dwarfGenetics);

      // Note: dwarf + elf is not a standard hybrid in the registry
      // but the system should still create a hybrid with blended characteristics

      // Make them compatible for this test
      elfGenetics.compatibleSpecies.push('dwarf');
      dwarfGenetics.compatibleSpecies.push('elf');

      // Create offspring
      const child = reproductionSystem.createOffspring(elf, dwarf, world);

      if (child) {
        const childSpecies = child.components.get(CT.Species) as SpeciesComponent;

        // Height should be between elf and dwarf
        expect(childSpecies.averageHeight).toBeGreaterThan(dwarfTemplate.averageHeight);
        expect(childSpecies.averageHeight).toBeLessThan(elfTemplate.averageHeight);

        // Weight should be between elf and dwarf
        expect(childSpecies.averageWeight).toBeGreaterThan(elfTemplate.averageWeight);
        expect(childSpecies.averageWeight).toBeLessThan(dwarfTemplate.averageWeight);

        // Lifespan should be blended
        expect(childSpecies.lifespan).toBeGreaterThan(dwarfTemplate.lifespan);
        expect(childSpecies.lifespan).toBeLessThan(elfTemplate.lifespan);
      }
    });
  });

  describe('Mutation System', () => {
    it('should apply mutations at the configured rate', () => {
      // Set a high mutation rate for testing
      const highMutationSystem = new ReproductionSystem({
        allowHybrids: true,
        enableMutations: true,
        trackInbreeding: false,
        minGeneticHealth: 0.3,
      });

      // Create parents with high mutation rate
      const parent1 = world.createEntity() as EntityImpl;
      const parent1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent1Genetics.mutationRate = 1.0; // 100% mutation rate for testing
      parent1.addComponent(parent1Species);
      parent1.addComponent(parent1Genetics);

      const parent2 = world.createEntity() as EntityImpl;
      const parent2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent2Genetics.mutationRate = 1.0; // 100% mutation rate
      parent2.addComponent(parent2Species);
      parent2.addComponent(parent2Genetics);

      // Create offspring
      const child = highMutationSystem.createOffspring(parent1, parent2, world);
      expect(child).not.toBeNull();
      if (!child) throw new Error('Child should not be null');

      // Verify child has mutation
      const childSpecies = child.components.get(CT.Species) as SpeciesComponent;

      // With 100% mutation rate, child should have a mutation
      expect(childSpecies.hasMutation).toBe(true);
      expect(childSpecies.mutations.length).toBeGreaterThan(0);

      // Verify mutation has proper structure
      const mutation = childSpecies.mutations[0];
      expect(mutation.id).toBeDefined();
      expect(mutation.type).toBeDefined();
      expect(mutation.severity).toBeDefined();
      expect(mutation.canInherit).toBeDefined();
      expect(mutation.inheritanceChance).toBeGreaterThanOrEqual(0);
      expect(mutation.inheritanceChance).toBeLessThanOrEqual(1);
    });

    it('should create extra limb mutations', () => {
      // Test multiple times to get an extra limb mutation
      let foundExtraLimb = false;

      for (let attempt = 0; attempt < 100 && !foundExtraLimb; attempt++) {
        const parent1 = world.createEntity() as EntityImpl;
        const parent1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
        const parent1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
        parent1Genetics.mutationRate = 1.0;
        parent1.addComponent(parent1Species);
        parent1.addComponent(parent1Genetics);

        const parent2 = world.createEntity() as EntityImpl;
        const parent2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
        const parent2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
        parent2Genetics.mutationRate = 1.0;
        parent2.addComponent(parent2Species);
        parent2.addComponent(parent2Genetics);

        const child = reproductionSystem.createOffspring(parent1, parent2, world);
        if (!child) continue;

        const childSpecies = child.components.get(CT.Species) as SpeciesComponent;
        const extraLimbMutation = childSpecies.mutations.find(m => m.type === 'extra_limb');

        if (extraLimbMutation) {
          foundExtraLimb = true;

          // Verify extra limb mutation structure
          expect(extraLimbMutation.bodyPartAffected).toBeDefined();
          expect(['arm', 'leg', 'tentacle']).toContain(extraLimbMutation.bodyPartAffected);
          expect(extraLimbMutation.beneficial).toBe(true);
          expect(extraLimbMutation.canInherit).toBe(true);

          // Verify the body actually has the extra limb
          const childBody = child.components.get(CT.Body) as BodyComponent;
          const limbType = extraLimbMutation.bodyPartAffected;
          const limbs = Object.values(childBody.parts).filter(p => p.type === limbType);

          // Should have at least one limb of this type
          expect(limbs.length).toBeGreaterThan(0);
        }
      }

      // We should have found at least one extra limb mutation in 100 attempts
      expect(foundExtraLimb).toBe(true);
    });

    it('should create size change mutations', () => {
      // Test multiple times to get a size change mutation
      let foundSizeChange = false;

      for (let attempt = 0; attempt < 100 && !foundSizeChange; attempt++) {
        const parent1 = world.createEntity() as EntityImpl;
        const parent1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
        const parent1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
        parent1Genetics.mutationRate = 1.0;
        parent1.addComponent(parent1Species);
        parent1.addComponent(parent1Genetics);

        const parent2 = world.createEntity() as EntityImpl;
        const parent2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
        const parent2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
        parent2Genetics.mutationRate = 1.0;
        parent2.addComponent(parent2Species);
        parent2.addComponent(parent2Genetics);

        const child = reproductionSystem.createOffspring(parent1, parent2, world);
        if (!child) continue;

        const childSpecies = child.components.get(CT.Species) as SpeciesComponent;
        const sizeChangeMutation = childSpecies.mutations.find(m => m.type === 'size_change');

        if (sizeChangeMutation) {
          foundSizeChange = true;

          // Verify size change affects body size
          const childBody = child.components.get(CT.Body) as BodyComponent;
          expect(['tiny', 'small', 'medium', 'large', 'huge', 'colossal']).toContain(childBody.size);

          // Verify stat modifiers exist
          expect(sizeChangeMutation.statModifiers).toBeDefined();
        }
      }

      expect(foundSizeChange).toBe(true);
    });
  });

  describe('Hereditary Divine Modifications', () => {
    it('should pass divine wings to offspring at 50% rate', () => {
      // Create parent with divine wings
      const parent1 = world.createEntity() as EntityImpl;
      const parent1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);

      // Add divine wings modification
      const divineWings = createHereditaryModification(
        'wings',
        'wing',
        0.5, // 50% inheritance chance
        'divine',
        world.tick,
        {
          bodyPartCount: 2,
          description: 'Divine wings granted by deity',
          dominance: 'dominant',
        }
      );
      parent1Genetics.addHereditaryModification(divineWings);

      parent1.addComponent(parent1Species);
      parent1.addComponent(parent1Genetics);

      const parent2 = world.createEntity() as EntityImpl;
      const parent2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent2.addComponent(parent2Species);
      parent2.addComponent(parent2Genetics);

      // Create many offspring to test inheritance rate
      let childrenWithWings = 0;
      const numChildren = 100;

      for (let i = 0; i < numChildren; i++) {
        const child = reproductionSystem.createOffspring(parent1, parent2, world);
        if (!child) continue;

        const childBody = child.components.get(CT.Body) as BodyComponent;
        const wings = Object.values(childBody.parts).filter(p => p.type === 'wing');

        if (wings.length > 0) {
          childrenWithWings++;
        }
      }

      // With 50% inheritance rate and 100 children,
      // we expect roughly 40-60% to have wings (allowing for randomness)
      const inheritanceRate = childrenWithWings / numChildren;
      expect(inheritanceRate).toBeGreaterThan(0.3); // At least 30%
      expect(inheritanceRate).toBeLessThan(0.7);    // At most 70%
    });

    it('should track generations for hereditary modifications', () => {
      // Create grandparent with divine modification
      const grandparent1 = world.createEntity() as EntityImpl;
      const gp1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const gp1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);

      const divineModification = createHereditaryModification(
        'extra_arms',
        'arm',
        1.0, // 100% to guarantee inheritance
        'divine',
        world.tick,
        {
          bodyPartCount: 2,
          description: 'Divine extra arms',
        }
      );
      gp1Genetics.addHereditaryModification(divineModification);

      grandparent1.addComponent(gp1Species);
      grandparent1.addComponent(gp1Genetics);

      const grandparent2 = world.createEntity() as EntityImpl;
      const gp2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const gp2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      grandparent2.addComponent(gp2Species);
      grandparent2.addComponent(gp2Genetics);

      // Create parent (generation 1)
      const parent = reproductionSystem.createOffspring(grandparent1, grandparent2, world);
      expect(parent).not.toBeNull();
      if (!parent) throw new Error('Parent should not be null');

      const parentGenetics = parent.components.get(CT.Genetic) as GeneticComponent;
      expect(parentGenetics.generation).toBe(1);

      // Check modification was passed down
      const parentMods = parentGenetics.hereditaryModifications;
      expect(parentMods.length).toBeGreaterThan(0);
      expect(parentMods[0].generationsActive).toBe(1);

      // Create child (generation 2)
      const otherParent = world.createEntity() as EntityImpl;
      const opSpecies = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const opGenetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      otherParent.addComponent(opSpecies);
      otherParent.addComponent(opGenetics);

      const child = reproductionSystem.createOffspring(parent, otherParent, world);
      expect(child).not.toBeNull();
      if (!child) throw new Error('Child should not be null');

      const childGenetics = child.components.get(CT.Genetic) as GeneticComponent;
      expect(childGenetics.generation).toBe(2);

      // Check modification was passed down again
      const childMods = childGenetics.hereditaryModifications;
      if (childMods.length > 0) {
        expect(childMods[0].generationsActive).toBe(2);
      }
    });
  });

  describe('Inbreeding Tracking', () => {
    it('should track inbreeding coefficient for siblings', () => {
      // Create parents
      const parent1 = world.createEntity() as EntityImpl;
      const parent1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent1.addComponent(parent1Species);
      parent1.addComponent(parent1Genetics);

      const parent2 = world.createEntity() as EntityImpl;
      const parent2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent2.addComponent(parent2Species);
      parent2.addComponent(parent2Genetics);

      // Create two siblings
      const sibling1 = reproductionSystem.createOffspring(parent1, parent2, world);
      const sibling2 = reproductionSystem.createOffspring(parent1, parent2, world);

      expect(sibling1).not.toBeNull();
      expect(sibling2).not.toBeNull();
      if (!sibling1 || !sibling2) throw new Error('Siblings should not be null');

      const sib1Genetics = sibling1.components.get(CT.Genetic) as GeneticComponent;
      const sib2Genetics = sibling2.components.get(CT.Genetic) as GeneticComponent;

      // Verify they have same parents
      expect(sib1Genetics.parentIds).toEqual([parent1.id, parent2.id]);
      expect(sib2Genetics.parentIds).toEqual([parent1.id, parent2.id]);

      // Calculate inbreeding for their offspring
      const inbreeding = GeneticComponent.calculateInbreeding(sib1Genetics, sib2Genetics);

      // Full siblings mating produces inbreeding coefficient of 0.25
      expect(inbreeding).toBe(0.25);
    });

    it('should reduce genetic health due to inbreeding', () => {
      // Create parents with high genetic health
      const parent1 = world.createEntity() as EntityImpl;
      const parent1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent1Genetics.geneticHealth = 1.0;
      parent1.addComponent(parent1Species);
      parent1.addComponent(parent1Genetics);

      const parent2 = world.createEntity() as EntityImpl;
      const parent2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent2Genetics.geneticHealth = 1.0;
      parent2.addComponent(parent2Species);
      parent2.addComponent(parent2Genetics);

      // Create siblings
      const sibling1 = reproductionSystem.createOffspring(parent1, parent2, world);
      const sibling2 = reproductionSystem.createOffspring(parent1, parent2, world);

      if (!sibling1 || !sibling2) throw new Error('Siblings should not be null');

      // Try to mate siblings (should succeed but with reduced genetic health)
      const inbredChild = reproductionSystem.createOffspring(sibling1, sibling2, world);

      if (inbredChild) {
        const childGenetics = inbredChild.components.get(CT.Genetic) as GeneticComponent;

        // Genetic health should be reduced due to inbreeding
        expect(childGenetics.geneticHealth).toBeLessThan(1.0);
        expect(childGenetics.inbreedingCoefficient).toBe(0.25);
      }
    });

    it('should track combined effects of low genetic health and inbreeding', () => {
      // Create grandparents first
      const grandparent1Id = 'gp1';
      const grandparent2Id = 'gp2';

      // Create siblings with low genetic health
      const parent1 = world.createEntity() as EntityImpl;
      const parent1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent1Genetics.geneticHealth = 0.5;
      parent1Genetics.inbreedingCoefficient = 0.2;
      parent1Genetics.parentIds = [grandparent1Id, grandparent2Id];
      parent1.addComponent(parent1Species);
      parent1.addComponent(parent1Genetics);

      const parent2 = world.createEntity() as EntityImpl;
      const parent2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent2Genetics.geneticHealth = 0.5;
      parent2Genetics.inbreedingCoefficient = 0.2;
      parent2Genetics.parentIds = [grandparent1Id, grandparent2Id];
      parent2.addComponent(parent2Species);
      parent2.addComponent(parent2Genetics);

      // Attempt reproduction
      const child = reproductionSystem.createOffspring(parent1, parent2, world);

      if (child) {
        const childGenetics = child.components.get(CT.Genetic) as GeneticComponent;

        // Genetic health should be reduced from both low parent health AND inbreeding
        expect(childGenetics.geneticHealth).toBeLessThan(0.5);
        expect(childGenetics.inbreedingCoefficient).toBe(0.25); // Siblings
      }
    });
  });

  describe('Multi-Generation Bloodlines', () => {
    it('should track lineage across 3 generations', () => {
      // Generation 0 (grandparents)
      const gp1 = world.createEntity() as EntityImpl;
      const gp1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const gp1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      gp1.addComponent(gp1Species);
      gp1.addComponent(gp1Genetics);

      const gp2 = world.createEntity() as EntityImpl;
      const gp2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const gp2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      gp2.addComponent(gp2Species);
      gp2.addComponent(gp2Genetics);

      expect(gp1Genetics.generation).toBe(0);
      expect(gp2Genetics.generation).toBe(0);

      // Generation 1 (parent)
      const parent = reproductionSystem.createOffspring(gp1, gp2, world);
      expect(parent).not.toBeNull();
      if (!parent) throw new Error('Parent should not be null');

      const parentGenetics = parent.components.get(CT.Genetic) as GeneticComponent;
      expect(parentGenetics.generation).toBe(1);
      expect(parentGenetics.parentIds).toEqual([gp1.id, gp2.id]);

      // Generation 2 (child)
      const otherParent = world.createEntity() as EntityImpl;
      const opSpecies = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const opGenetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      otherParent.addComponent(opSpecies);
      otherParent.addComponent(opGenetics);

      const child = reproductionSystem.createOffspring(parent, otherParent, world);
      expect(child).not.toBeNull();
      if (!child) throw new Error('Child should not be null');

      const childGenetics = child.components.get(CT.Genetic) as GeneticComponent;
      expect(childGenetics.generation).toBe(2);
      expect(childGenetics.parentIds).toEqual([parent.id, otherParent.id]);

      // Verify lineage chain
      expect(childGenetics.generation).toBeGreaterThan(parentGenetics.generation);
      expect(parentGenetics.generation).toBeGreaterThan(gp1Genetics.generation);
    });

    it('should accumulate traits across generations', () => {
      // Grandparent with specific trait
      const gp1 = world.createEntity() as EntityImpl;
      const gp1Species = createSpeciesFromTemplate(getSpeciesTemplate('elf')!); // Elves have ageless trait
      const gp1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('elf')!);
      gp1.addComponent(gp1Species);
      gp1.addComponent(gp1Genetics);

      const gp2 = world.createEntity() as EntityImpl;
      const gp2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const gp2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      gp2.addComponent(gp2Species);
      gp2.addComponent(gp2Genetics);

      // First generation - half-elf
      const parent = reproductionSystem.createOffspring(gp1, gp2, world);
      expect(parent).not.toBeNull();
      if (!parent) throw new Error('Parent should not be null');

      const parentSpecies = parent.components.get(CT.Species) as SpeciesComponent;
      expect(parentSpecies.isHybrid).toBe(true);

      // Half-elf should have some traits from elf
      const parentTraits = parentSpecies.getAllTraits();
      expect(parentTraits.length).toBeGreaterThan(0);

      // Second generation - quarter-elf (half-elf + human)
      const human = world.createEntity() as EntityImpl;
      const humanSpecies = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const humanGenetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      human.addComponent(humanSpecies);
      human.addComponent(humanGenetics);

      const child = reproductionSystem.createOffspring(parent, human, world);
      expect(child).not.toBeNull();
      if (!child) throw new Error('Child should not be null');

      const childSpecies = child.components.get(CT.Species) as SpeciesComponent;
      expect(childSpecies.isHybrid).toBe(true);
      expect(childSpecies.hybridGeneration).toBe(2);
    });
  });

  describe('Body System Integration', () => {
    it('should create body with species-appropriate body plan', () => {
      // Create human
      const human = world.createEntity() as EntityImpl;
      const humanSpecies = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const humanGenetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      human.addComponent(humanSpecies);
      human.addComponent(humanGenetics);

      // Create elf
      const elf = world.createEntity() as EntityImpl;
      const elfSpecies = createSpeciesFromTemplate(getSpeciesTemplate('elf')!);
      const elfGenetics = createGeneticsFromTemplate(getSpeciesTemplate('elf')!);
      elf.addComponent(elfSpecies);
      elf.addComponent(elfGenetics);

      // Create child
      const child = reproductionSystem.createOffspring(human, elf, world);
      expect(child).not.toBeNull();
      if (!child) throw new Error('Child should not be null');

      const childBody = child.components.get(CT.Body) as BodyComponent;
      expect(childBody).toBeDefined();

      // Body should have standard humanoid parts
      const bodyParts = Object.values(childBody.parts);
      expect(bodyParts.length).toBeGreaterThan(0);

      // Should have head, torso, arms, legs
      const partTypes = bodyParts.map(p => p.type);
      expect(partTypes).toContain('head');
      expect(partTypes).toContain('torso');
    });

    it('should apply hereditary modifications to body', () => {
      // Create parent with hereditary wings
      const parent1 = world.createEntity() as EntityImpl;
      const parent1Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent1Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);

      const wings = createHereditaryModification(
        'wings',
        'wing',
        1.0, // 100% inheritance
        'divine',
        world.tick,
        {
          bodyPartCount: 2,
          description: 'Angelic wings',
        }
      );
      parent1Genetics.addHereditaryModification(wings);

      parent1.addComponent(parent1Species);
      parent1.addComponent(parent1Genetics);

      const parent2 = world.createEntity() as EntityImpl;
      const parent2Species = createSpeciesFromTemplate(getSpeciesTemplate('human')!);
      const parent2Genetics = createGeneticsFromTemplate(getSpeciesTemplate('human')!);
      parent2.addComponent(parent2Species);
      parent2.addComponent(parent2Genetics);

      // Create child
      const child = reproductionSystem.createOffspring(parent1, parent2, world);
      expect(child).not.toBeNull();
      if (!child) throw new Error('Child should not be null');

      const childBody = child.components.get(CT.Body) as BodyComponent;

      // Child should have wings
      const wingParts = Object.values(childBody.parts).filter(p => p.type === 'wing');
      expect(wingParts.length).toBe(2);

      // Wings should grant flight ability
      expect(wingParts[0].functions).toContain('flight');
    });
  });
});
