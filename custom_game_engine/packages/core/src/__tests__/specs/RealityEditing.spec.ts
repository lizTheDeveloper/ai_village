import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';

/**
 * Type definitions for Reality Editing System (specification)
 * These types define the API contract for the future implementation.
 */

/** Valid edit types for reality editing operations */
type RealityEditType = 'replace' | 'delete' | 'insert' | 'strikethrough' | 'annotate';

/** Reality edit request structure */
interface RealityEditRequest {
  editType: RealityEditType;
  target: Entity;
  originalText: string;
  revisedText: string;
}

/**
 * Reality Editing System Specifications
 *
 * The idea that reality is written text that can be revised. Editorial magic allows
 * you to edit the fabric of reality itself - insert, delete, replace, annotate, or
 * strikethrough existence.
 *
 * Some beings are "protagonists" and have plot armor. Supporting characters die easily.
 * You can only be killed at narratively appropriate moments.
 *
 * See: architecture/LITERARY_SURREALISM_SPEC.md Section 7
 */
describe('Reality Editing System', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Editorial Magic', () => {
    describe('replace operation', () => {
      it('should replace "door was locked" with "door was open"', () => {
        const door = world.createDoor({ x: 10, y: 10, locked: true });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });
        mage.learnSpell('reality_edit');

        mage.editReality({
          editType: 'replace',
          target: door,
          originalText: 'The door was locked',
          revisedText: 'The door was open',
        });

        expect(door.getComponent('door')?.locked).toBe(false);
        expect(door.getComponent('door')?.open).toBe(true);
      });

      it('should track difficulty (easy for simple edits)', () => {
        const door = world.createDoor({ x: 10, y: 10, locked: true });

        const difficulty = world.calculateEditDifficulty({
          editType: 'replace',
          target: door,
          originalText: 'The door was locked',
          revisedText: 'The door was open',
        });

        expect(difficulty).toBe('easy');
      });

      it('should create consequence: who opened it? where did they go?', () => {
        const door = world.createDoor({ x: 10, y: 10, locked: true });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        const result = mage.editReality({
          editType: 'replace',
          target: door,
          originalText: 'The door was locked',
          revisedText: 'The door was open',
        });

        expect(result.consequences).toBeDefined();
        expect(result.consequences).toContain('who opened it');
      });
    });

    describe('delete operation', () => {
      it('should delete "guard stood watch" making guard disappear', () => {
        const guard = world.createAgent({ position: { x: 10, y: 10 } });
        guard.setState('standing_watch');

        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.editReality({
          editType: 'delete',
          target: guard,
          originalText: 'The guard stood watch',
          revisedText: '',
        });

        expect(world.entities.has(guard.id)).toBe(false);
      });

      it('should have moderate difficulty for deleting entities', () => {
        const guard = world.createAgent({ position: { x: 10, y: 10 } });

        const difficulty = world.calculateEditDifficulty({
          editType: 'delete',
          target: guard,
          originalText: 'The guard stood watch',
          revisedText: '',
        });

        expect(difficulty).toBe('moderate');
      });

      it('should create limbo for deleted entities (might still exist, angry)', () => {
        const guard = world.createAgent({ position: { x: 10, y: 10 } });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.editReality({
          editType: 'delete',
          target: guard,
          originalText: 'The guard stood watch',
          revisedText: '',
        });

        const limbo = world.getLimbo();
        const limboEntity = limbo.find(e => e.originalId === guard.id);

        expect(limboEntity).toBeDefined();
        expect(limboEntity?.emotional_state).toBe('angry');
      });
    });

    describe('insert operation', () => {
      it('should insert "dragon in the room" creating actual dragon', () => {
        const room = world.createRoom({ x: 10, y: 10, width: 10, height: 10 });

        const mage = world.createAgent({ position: { x: 15, y: 15 } });

        mage.editReality({
          editType: 'insert',
          target: room,
          originalText: 'There was nothing in the room',
          revisedText: 'There was a dragon in the room',
        });

        const dragon = world.query()
          .with('dragon')
          .executeEntities()[0];

        expect(dragon).toBeDefined();
        expect(dragon.getComponent('position')?.x).toBeCloseTo(10, 5);
      });

      it('should have very hard difficulty for inserting complex entities', () => {
        const room = world.createRoom({ x: 10, y: 10, width: 10, height: 10 });

        const difficulty = world.calculateEditDifficulty({
          editType: 'insert',
          target: room,
          originalText: 'There was nothing in the room',
          revisedText: 'There was a dragon in the room',
        });

        expect(difficulty).toBe('very_hard');
      });

      it('should make inserted dragon confused and angry (just appeared)', () => {
        const room = world.createRoom({ x: 10, y: 10, width: 10, height: 10 });

        const mage = world.createAgent({ position: { x: 15, y: 15 } });

        mage.editReality({
          editType: 'insert',
          target: room,
          originalText: 'There was nothing in the room',
          revisedText: 'There was a dragon in the room',
        });

        const dragon = world.query().with('dragon').executeEntities()[0];

        expect(dragon.getComponent('emotions')?.confusion).toBeGreaterThan(80);
        expect(dragon.getComponent('emotions')?.anger).toBeGreaterThan(50);
      });
    });

    describe('strikethrough operation', () => {
      it('should make strikethrough text still partially real', () => {
        const guard = world.createAgent({ position: { x: 10, y: 10 } });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.editReality({
          editType: 'strikethrough',
          target: guard,
          originalText: 'The guard stood watch',
          revisedText: '~~The guard stood watch~~',
        });

        expect(guard.getComponent('existence')?.strength).toBeLessThan(1.0);
        expect(guard.getComponent('visual')?.opacity).toBeLessThan(1.0);
        expect(world.entities.has(guard.id)).toBe(true); // Still exists, but faded
      });

      it('should allow strikethrough entities to partially interact', () => {
        const guard = world.createAgent({ position: { x: 10, y: 10 } });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.editReality({
          editType: 'strikethrough',
          target: guard,
          originalText: 'The guard stood watch',
          revisedText: '~~The guard stood watch~~',
        });

        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        // Can somewhat interact, but at reduced effectiveness
        const conversation = agent.startConversation(guard);

        expect(conversation.clarity).toBeLessThan(1.0);
      });
    });

    describe('annotate operation', () => {
      it('should create marginal entities from annotations', () => {
        const building = world.createBuilding('house', { x: 10, y: 10 });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.editReality({
          editType: 'annotate',
          target: building,
          originalText: 'The house stood empty',
          revisedText: 'The house stood empty [Note: seems haunted]',
        });

        const marginalia = world.query()
          .with('marginalia_entity')
          .executeEntities()[0];

        expect(marginalia).toBeDefined();
        expect(marginalia.getComponent('marginalia_entity')?.note).toContain('haunted');
      });

      it('should make annotations influence reality', () => {
        const building = world.createBuilding('house', { x: 10, y: 10 });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.editReality({
          editType: 'annotate',
          target: building,
          originalText: 'The house stood empty',
          revisedText: 'The house stood empty [Note: definitely haunted]',
        });

        const haunted = building.hasComponent('haunted');

        expect(haunted).toBe(true);
      });
    });

    describe('track changes mode', () => {
      it('should show edit history of reality', () => {
        const door = world.createDoor({ x: 10, y: 10, locked: true });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.editReality({
          editType: 'replace',
          target: door,
          originalText: 'The door was locked',
          revisedText: 'The door was open',
        });

        const history = world.getEditHistory(door);

        expect(history).toHaveLength(1);
        expect(history[0].originalText).toBe('The door was locked');
        expect(history[0].revisedText).toBe('The door was open');
      });

      it('should allow seeing what was written before', () => {
        world.enableTrackChangesMode();

        const entity = world.createAgent({ position: { x: 10, y: 10 } });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.editReality({
          editType: 'replace',
          target: entity,
          originalText: 'The warrior was brave',
          revisedText: 'The warrior was cowardly',
        });

        const previous = world.getPreviousState(entity);

        expect(previous?.traits).toContain('brave');
      });

      it('should make "accept all changes" catastrophic', () => {
        world.enableTrackChangesMode();

        // Make many edits
        for (let i = 0; i < 100; i++) {
          world.editReality({
            editType: 'delete',
            target: world.getRandomEntity(),
            originalText: 'Entity exists',
            revisedText: '',
          });
        }

        expect(() => {
          world.acceptAllChanges();
        }).toThrow('Accepting all changes would cause reality collapse');
      });
    });

    describe('edit resistance', () => {
      it('should increase resistance for important entities', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';

        const edit = {
          editType: 'delete' as const,
          target: protagonist,
          originalText: 'The hero stood ready',
          revisedText: '',
        };

        const resistance = world.calculateEditResistance(edit);

        expect(resistance).toBeGreaterThan(0.9); // Very high resistance
      });

      it('should decrease resistance for minor entities', () => {
        const extra = world.createAgent({ position: { x: 10, y: 10 } });
        extra.getComponent('plot_armor')!.protagonistLevel = 'extra';

        const edit = {
          editType: 'delete' as const,
          target: extra,
          originalText: 'A peasant walked by',
          revisedText: '',
        };

        const resistance = world.calculateEditResistance(edit);

        expect(resistance).toBeLessThan(0.2); // Very low resistance
      });
    });

    describe('consequence risk', () => {
      it('should have high consequence risk for large-scale edits', () => {
        const city = world.createCity('Metropolis', { x: 100, y: 100 });

        const edit = {
          editType: 'delete' as const,
          target: city,
          originalText: 'The city sprawled across the horizon',
          revisedText: '',
        };

        const risk = world.calculateConsequenceRisk(edit);

        expect(risk).toBeGreaterThan(0.8);
      });

      it('should create unintended side effects with high risk', () => {
        const building = world.createBuilding('castle', { x: 50, y: 50 });

        const mage = world.createAgent({ position: { x: 51, y: 50 } });

        const result = mage.editReality({
          editType: 'replace',
          target: building,
          originalText: 'The castle was made of stone',
          revisedText: 'The castle was made of candy',
        });

        expect(result.unintendedEffects).toBeDefined();
        expect(result.unintendedEffects.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Plot Armor and Narrative Immunity', () => {
    describe('protagonist levels', () => {
      it('should assign plot armor levels: extra, supporting, deuteragonist, protagonist, chosen_one', () => {
        const extra = world.createAgent({ position: { x: 10, y: 10 } });
        const protagonist = world.createAgent({ position: { x: 11, y: 10 } });
        const chosenOne = world.createAgent({ position: { x: 12, y: 10 } });

        extra.getComponent('plot_armor')!.protagonistLevel = 'extra';
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';
        chosenOne.getComponent('plot_armor')!.protagonistLevel = 'chosen_one';

        expect(extra.getComponent('plot_armor')?.fatePoints).toBeLessThan(
          protagonist.getComponent('plot_armor')?.fatePoints ?? 0
        );
        expect(protagonist.getComponent('plot_armor')?.fatePoints).toBeLessThan(
          chosenOne.getComponent('plot_armor')?.fatePoints ?? 0
        );
      });
    });

    describe('protagonist immunities', () => {
      it('should prevent death before story resolves', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';

        const villain = world.createAgent({ position: { x: 11, y: 10 } });

        villain.attack(protagonist, { damage: 1000 }); // Lethal damage

        expect(protagonist.health).toBeGreaterThan(0); // Survived
        expect(protagonist.health).toBe(1); // But barely
      });

      it('should create unlikely coincidences favoring protagonists', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';

        protagonist.attemptImpossibleTask();

        // Should succeed despite low probability
        expect(protagonist.lastTaskSuccessful).toBe(true);
      });

      it('should enable last-minute rescues', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';

        protagonist.health = 1; // Near death
        protagonist.fallOffCliff();

        world.tick(1);

        // Mysteriously saved
        expect(protagonist.health).toBeGreaterThan(1);
        expect(world.query().with('rescue_event').executeEntities()).toHaveLength(1);
      });

      it('should make villains monologue instead of killing immediately', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';

        const villain = world.createAgent({ position: { x: 11, y: 10 } });
        villain.captureTarget(protagonist);

        world.tick(1);

        expect(villain.currentBehavior).toBe('monologue');
        expect(protagonist.health).toBeGreaterThan(0); // Not killed yet
      });
    });

    describe('protagonist compulsions', () => {
      it('should compel protagonists to investigate mysterious noises', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';

        world.createEvent('mysterious_noise', { x: 20, y: 20 });

        world.tick(100);

        const distance = Math.hypot(
          protagonist.getComponent('position').x - 20,
          protagonist.getComponent('position').y - 20
        );

        expect(distance).toBeLessThan(5); // Drawn to investigate
      });

      it('should prevent protagonists from ignoring cries for help', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';

        const victim = world.createAgent({ position: { x: 20, y: 20 } });
        victim.cryForHelp();

        protagonist.attemptToIgnore(victim);

        expect(protagonist.currentBehavior).toBe('going_to_help');
      });

      it('should draw protagonists toward central conflict', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';

        world.createConflict('central_plot', { x: 100, y: 100 });

        world.tick(1000);

        const distance = Math.hypot(
          protagonist.getComponent('position').x - 100,
          protagonist.getComponent('position').y - 100
        );

        expect(distance).toBeLessThan(50); // Drawn toward plot
      });

      it('should compel protagonists to make dramatic speeches', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';

        protagonist.faceDireCircumstances();

        const speech = protagonist.speak();

        expect(speech.dramatic).toBe(true);
        expect(speech.length).toBeGreaterThan(100); // Long speech
      });
    });

    describe('fate points', () => {
      it('should allow spending fate points to avoid death', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';
        protagonist.getComponent('plot_armor')!.fatePoints = 7;

        const villain = world.createAgent({ position: { x: 11, y: 10 } });

        villain.dealLethalBlow(protagonist);

        expect(protagonist.health).toBeGreaterThan(0);
        expect(protagonist.getComponent('plot_armor')?.fatePoints).toBe(6); // Spent 1
      });

      it('should allow death when fate points exhausted', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';
        protagonist.getComponent('plot_armor')!.fatePoints = 0;

        const villain = world.createAgent({ position: { x: 11, y: 10 } });

        villain.dealLethalBlow(protagonist);

        expect(protagonist.health).toBe(0); // Actually died
      });
    });

    describe('supporting character mortality', () => {
      it('should make supporting characters die easily', () => {
        const supporting = world.createAgent({ position: { x: 10, y: 10 } });
        supporting.getComponent('plot_armor')!.protagonistLevel = 'supporting';

        const villain = world.createAgent({ position: { x: 11, y: 10 } });

        villain.attack(supporting, { damage: 50 });

        expect(supporting.health).toBeLessThanOrEqual(0); // Died from moderate damage
      });

      it('should make extras die from narrative convenience', () => {
        const extra = world.createAgent({ position: { x: 10, y: 10 } });
        extra.getComponent('plot_armor')!.protagonistLevel = 'extra';

        world.narrativelyConvenientDisaster({ x: 10, y: 10 });

        expect(world.entities.has(extra.id)).toBe(false); // Died offscreen
      });
    });

    describe('narratively appropriate death', () => {
      it('should only allow protagonist death at narratively appropriate moments', () => {
        const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
        protagonist.getComponent('plot_armor')!.protagonistLevel = 'protagonist';
        protagonist.getComponent('plot_armor')!.fatePoints = 0;

        // Try to die in mundane way
        protagonist.stubToe();

        expect(protagonist.health).toBeGreaterThan(0); // Not narratively appropriate

        // Try to die at climax
        world.triggerClimax();
        protagonist.faceNemesis();
        protagonist.receiveLethalWound();

        expect(protagonist.health).toBeLessThanOrEqual(0); // Narratively appropriate
      });
    });

    describe('becoming a protagonist', () => {
      it('should allow becoming protagonist through narrative weight', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        agent.getComponent('plot_armor')!.protagonistLevel = 'extra';

        // Accumulate narrative weight
        agent.performHeroicDeeds(10);
        agent.faceChallenges(20);
        agent.developCharacter(15);

        world.tick(1000);

        expect(agent.getComponent('plot_armor')?.protagonistLevel).toBe('protagonist');
      });
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw if editing reality with invalid edit type', () => {
      const entity = world.createAgent({ position: { x: 10, y: 10 } });

      // Test that runtime validation rejects invalid edit types
      // TypeScript correctly prevents this at compile-time, but we need to test runtime validation
      // for cases where data might come from external sources (saved games, network, etc.)
      // Using unknown → RealityEditRequest to explicitly bypass type safety for testing
      const invalidEditRequest = {
        editType: 'invalid',
        target: entity,
        originalText: 'test',
        revisedText: 'test2',
      } as unknown as RealityEditRequest;

      expect(() => {
        world.editReality(invalidEditRequest);
      }).toThrow('Invalid edit type: invalid');
    });

    it('should throw if editing non-existent entity', () => {
      expect(() => {
        world.editReality({
          editType: 'delete',
          target: { id: 'nonexistent' } as Entity,
          originalText: 'test',
          revisedText: '',
        });
      }).toThrow('Cannot edit non-existent entity');
    });

    it('should throw if attempting edit without sufficient power', () => {
      const weakMage = world.createAgent({ position: { x: 10, y: 10 } });
      weakMage.skills.reality_editing = 1;

      const dragon = world.createEntity();
      dragon.addComponent('dragon', {});

      expect(() => {
        weakMage.editReality({
          editType: 'insert',
          target: dragon,
          originalText: 'nothing',
          revisedText: 'a dragon',
        });
      }).toThrow('Insufficient reality editing skill for this complexity');
    });

    it('should throw if spending fate points when none remain', () => {
      const protagonist = world.createAgent({ position: { x: 10, y: 10 } });
      protagonist.getComponent('plot_armor')!.fatePoints = 0;

      expect(() => {
        protagonist.spendFatePoint();
      }).toThrow('No fate points remaining');
    });
  });
});
