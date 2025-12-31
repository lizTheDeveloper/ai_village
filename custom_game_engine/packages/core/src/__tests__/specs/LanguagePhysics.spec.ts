import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';

/**
 * Language Physics System Specifications
 *
 * Inspired by Walter Moers' Zamonia, Jorge Luis Borges, Lewis Carroll, and Terry Pratchett.
 *
 * Words have mass and momentum. Metaphors become literal. Punctuation has power.
 * A well-chosen adjective weighs more than a clumsy one. Call something "sharp as a tack"
 * and it cuts you.
 *
 * See: architecture/LITERARY_SURREALISM_SPEC.md Section 1
 */
describe('Language Physics System', () => {
  let world: WorldImpl;

  beforeEach(() => {
    world = new WorldImpl();
  });

  describe('Words as Physical Objects', () => {
    describe('word mass calculation', () => {
      it('should calculate mass based on word importance', () => {
        const articleMass = world.calculateWordMass('the', 'spoken');
        const emotionMass = world.calculateWordMass('love', 'spoken');
        const complexMass = world.calculateWordMass('melancholy', 'spoken');

        expect(articleMass).toBeLessThan(emotionMass);
        expect(emotionMass).toBeLessThan(complexMass);
      });

      it('should assign light mass to articles and conjunctions', () => {
        const the = world.calculateWordMass('the', 'spoken');
        const and = world.calculateWordMass('and', 'spoken');
        const but = world.calculateWordMass('but', 'spoken');

        expect(the).toBeCloseTo(0.1, 1);
        expect(and).toBeCloseTo(0.1, 1);
        expect(but).toBeCloseTo(0.15, 1);
      });

      it('should assign heavy mass to emotions and concepts', () => {
        const love = world.calculateWordMass('love', 'spoken');
        const melancholy = world.calculateWordMass('melancholy', 'spoken');
        const schadenfreude = world.calculateWordMass('schadenfreude', 'spoken');

        expect(love).toBeGreaterThan(40);
        expect(melancholy).toBeGreaterThan(80);
        expect(schadenfreude).toBeGreaterThan(150); // Borrowed words are dense
      });

      it('should vary mass based on context (spoken/written/thought)', () => {
        const spokenWord = world.calculateWordMass('betrayal', 'spoken');
        const writtenWord = world.calculateWordMass('betrayal', 'written');
        const thoughtWord = world.calculateWordMass('betrayal', 'thought');

        expect(spokenWord).toBeGreaterThan(thoughtWord); // Spoken has more weight
        expect(writtenWord).toBeGreaterThan(spokenWord); // Written is most permanent
      });
    });

    describe('word physical behavior', () => {
      it('should allow dropping a heavy word that dents the floor', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });
        const word = world.createWordEntity('melancholy', { x: 10, y: 10, z: 2 });

        mage.dropWord(word);

        const tile = world.getTileAt(10, 10);
        expect(tile.dented).toBe(true);
        expect(tile.dentDepth).toBeGreaterThan(0);
      });

      it('should allow light words to float like bubbles', () => {
        const word = world.createWordEntity('the', { x: 10, y: 10, z: 0 });

        world.tick(10); // Simulate time passing

        const position = word.getComponent('position');
        expect(position.z).toBeGreaterThan(0); // Word has floated upward
      });

      it('should make synonym clouds drift together', () => {
        const happy = world.createWordEntity('happy', { x: 10, y: 10, z: 1 });
        const joyful = world.createWordEntity('joyful', { x: 15, y: 10, z: 1 });
        const cheerful = world.createWordEntity('cheerful', { x: 20, y: 10, z: 1 });

        world.tick(100); // Let gravitational attraction work

        const happyPos = happy.getComponent('position');
        const joyfulPos = joyful.getComponent('position');
        const cheerfulPos = cheerful.getComponent('position');

        // Synonyms should have moved closer together
        const initialDistance = 10;
        const currentDistance = Math.abs(happyPos.x - joyfulPos.x);

        expect(currentDistance).toBeLessThan(initialDistance);
      });

      it('should make antonyms repel each other', () => {
        const love = world.createWordEntity('love', { x: 10, y: 10, z: 1 });
        const hate = world.createWordEntity('hate', { x: 11, y: 10, z: 1 });

        const initialDistance = 1;

        world.tick(100); // Let repulsion work

        const lovePos = love.getComponent('position');
        const hatePos = hate.getComponent('position');
        const currentDistance = Math.abs(lovePos.x - hatePos.x);

        expect(currentDistance).toBeGreaterThan(initialDistance);
      });

      it('should make forgotten words fade and become transparent', () => {
        const word = world.createWordEntity('obsolete_term', { x: 10, y: 10, z: 1 });

        // Mark as rarely used
        world.tick(1000); // Long time passes without anyone using the word

        const opacity = word.getComponent('visual')?.opacity;
        expect(opacity).toBeLessThan(1.0);
      });

      it('should make overused words wear thin and tear', () => {
        const word = world.createWordEntity('like', { x: 10, y: 10, z: 1 });

        // Use the word excessively
        for (let i = 0; i < 1000; i++) {
          world.useWord(word);
        }

        const durability = word.getComponent('word_physics')?.durability;
        expect(durability).toBeLessThan(100);
        expect(word.getComponent('word_physics')?.isTorn).toBe(true);
      });
    });

    describe('alliteration resonance', () => {
      it('should create harmonic resonance with alliterative words', () => {
        const peter = world.createWordEntity('Peter', { x: 10, y: 10, z: 1 });
        const piper = world.createWordEntity('piper', { x: 11, y: 10, z: 1 });
        const picked = world.createWordEntity('picked', { x: 12, y: 10, z: 1 });

        const resonance = world.calculateAlliterativeResonance([peter, piper, picked]);

        expect(resonance).toBeGreaterThan(0);
        expect(resonance).toBeCloseTo(3, 0); // 3 alliterative words
      });

      it('should amplify effects when alliterative phrase is spoken', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });

        const normalPhrase = mage.speak('destroy the door');
        const alliterativePhrase = mage.speak('break the barrier');

        expect(alliterativePhrase.power).toBeGreaterThan(normalPhrase.power);
      });
    });
  });

  describe('Metaphor Literalization', () => {
    describe('metaphor detection', () => {
      it('should detect common metaphors in speech', () => {
        const speech = "He's sharp as a tack";

        const metaphor = world.detectMetaphor(speech);

        expect(metaphor).toBeDefined();
        expect(metaphor?.phrase).toBe('sharp as a tack');
        expect(metaphor?.tenor).toBe('he');
        expect(metaphor?.vehicle).toBe('tack');
      });

      it('should detect multiple metaphors in complex speech', () => {
        const speech = "Her heart of stone was drowning in paperwork";

        const metaphors = world.detectAllMetaphors(speech);

        expect(metaphors).toHaveLength(2);
        expect(metaphors[0].phrase).toBe('heart of stone');
        expect(metaphors[1].phrase).toBe('drowning in paperwork');
      });
    });

    describe('literalization chance', () => {
      it('should have base literalization chance', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });

        const chance = world.getMetaphorLiteralizationChance(mage);

        expect(chance).toBeGreaterThan(0);
        expect(chance).toBeLessThan(1);
      });

      it('should increase literalization chance with poetic skill', () => {
        const novice = world.createAgent({ position: { x: 10, y: 10 } });
        novice.skills.poetry = 1;

        const poet = world.createAgent({ position: { x: 10, y: 10 } });
        poet.skills.poetry = 10;

        const noviceChance = world.getMetaphorLiteralizationChance(novice);
        const poetChance = world.getMetaphorLiteralizationChance(poet);

        expect(poetChance).toBeGreaterThan(noviceChance);
      });
    });

    describe('literal effects', () => {
      it('should make "sharp as a tack" literally cutting', () => {
        const target = world.createAgent({ position: { x: 10, y: 10 } });
        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.speak("That person is sharp as a tack");

        const metaphor = world.detectMetaphor("That person is sharp as a tack");
        world.literalizeMetaphor(target, metaphor!);

        const sharpness = target.getComponent('metaphor_effect')?.effect;
        expect(sharpness).toBe('cutting_edge');
        expect(target.canCut).toBe(true);
      });

      it('should make "heart of stone" literal granite chest', () => {
        const target = world.createAgent({ position: { x: 10, y: 10 } });

        const metaphor = world.detectMetaphor("He has a heart of stone");
        world.literalizeMetaphor(target, metaphor!);

        const bodyPart = target.getComponent('body')?.getPart('chest');
        expect(bodyPart?.material).toBe('granite');
        expect(bodyPart?.temperature).toBeLessThan(target.body.averageTemperature);
      });

      it('should make "time flies" create temporal entity with wings', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });

        mage.speak("Time flies when you're having fun");

        const metaphor = world.detectMetaphor("Time flies when you're having fun");
        world.literalizeMetaphor(null, metaphor!); // Affects world, not specific target

        const entities = world.query().with('temporal_entity').with('wings').executeEntities();

        expect(entities.length).toBeGreaterThan(0);
        expect(entities[0].getComponent('temporal_entity')?.stealsTime).toBe(true);
      });

      it('should make "drowning in paperwork" create liquid documents', () => {
        const office = world.createBuilding('office', { x: 20, y: 20 });
        const worker = world.createAgent({ position: { x: 20, y: 20 } });

        worker.speak("I'm drowning in paperwork!");

        const metaphor = world.detectMetaphor("I'm drowning in paperwork!");
        world.literalizeMetaphor(worker, metaphor!);

        const liquid = world.getEntitiesAt(20, 20).find(e => e.hasComponent('liquid'));

        expect(liquid).toBeDefined();
        expect(liquid?.getComponent('liquid')?.type).toBe('document_fluid');
        expect(worker.getComponent('breathing')?.canBreathe).toBe(false);
      });

      it('should make "food for thought" create edible ideas', () => {
        const philosopher = world.createAgent({ position: { x: 10, y: 10 } });

        philosopher.speak("This gives me food for thought");

        const metaphor = world.detectMetaphor("This gives me food for thought");
        world.literalizeMetaphor(philosopher, metaphor!);

        const idea = philosopher.inventory.getItem('edible_idea');

        expect(idea).toBeDefined();
        expect(idea.edible).toBe(true);
        expect(idea.nutritionValue).toBeGreaterThan(0);
      });

      it('should make "burning with anger" create literal flames', () => {
        const angryPerson = world.createAgent({ position: { x: 10, y: 10 } });
        angryPerson.emotions.anger = 100;

        angryPerson.speak("I'm burning with anger!");

        const metaphor = world.detectMetaphor("I'm burning with anger!");
        world.literalizeMetaphor(angryPerson, metaphor!);

        expect(angryPerson.hasComponent('on_fire')).toBe(true);
        expect(angryPerson.getComponent('on_fire')?.source).toBe('emotional_metaphor');
      });
    });
  });

  describe('Poetic Magic Paradigm', () => {
    describe('rhyme scheme amplification', () => {
      it('should amplify power with couplets (2x)', () => {
        const poet = world.createAgent({ position: { x: 10, y: 10 } });
        poet.learnSpell('poetic_fireball');

        const couplet = "Flames ignite and burning bright,\nConsume my foes with blazing might.";

        const power = poet.castPoeticSpell('poetic_fireball', couplet);

        expect(power).toBeCloseTo(2, 0); // 2x base power for couplet
      });

      it('should amplify power with sonnets (14x)', () => {
        const poet = world.createAgent({ position: { x: 10, y: 10 } });
        poet.learnSpell('poetic_creation');

        const sonnet = [
          "When I do count the clock that tells the time,",
          "And see the brave day sunk in hideous night,",
          "When I behold the violet past prime,",
          "And sable curls all silvered o'er with white,",
          "When lofty trees I see barren of leaves,",
          "Which erst from heat did canopy the herd,",
          "And summer's green all girded up in sheaves,",
          "Borne on the bier with white and bristly beard,",
          "Then of thy beauty do I question make,",
          "That thou among the wastes of time must go,",
          "Since sweets and beauties do themselves forsake,",
          "And die as fast as they see others grow,",
          "And nothing 'gainst Time's scythe can make defence,",
          "Save breed, to brave him when he takes thee hence.",
        ].join('\n');

        const power = poet.castPoeticSpell('poetic_creation', sonnet);

        expect(power).toBeCloseTo(14, 0); // 14x for sonnet
      });
    });

    describe('meter effects', () => {
      it('should treat iambic pentameter as standard (1x)', () => {
        const poet = world.createAgent({ position: { x: 10, y: 10 } });

        const iambic = "da-DUM da-DUM da-DUM da-DUM da-DUM";

        const power = poet.castPoeticSpell('test_spell', iambic);

        expect(power).toBeCloseTo(1, 0);
      });

      it('should make dactylic meter unstable (risk of backlash)', () => {
        const poet = world.createAgent({ position: { x: 10, y: 10 } });

        const dactylic = "DUM-da-da DUM-da-da DUM-da-da DUM";

        const result = poet.castPoeticSpell('test_spell', dactylic);

        expect(result.mishapChance).toBeGreaterThan(0.3); // High risk
      });

      it('should cause backlash on broken meter', () => {
        const poet = world.createAgent({ position: { x: 10, y: 10 } });

        const brokenMeter = "This doesn't scan properly at all, does it?";

        expect(() => {
          poet.castPoeticSpell('test_spell', brokenMeter);
        }).toThrow('Meter violation detected');
      });
    });

    describe('enjambment spell linking', () => {
      it('should link spells across lines with enjambment', () => {
        const poet = world.createAgent({ position: { x: 10, y: 10 } });

        const enjambed = [
          "The fire rises and the water",
          "falls, creating steam that drifts",
          "across the battlefield."
        ].join('\n');

        const result = poet.castPoeticSpell('elemental_combo', enjambed);

        expect(result.linkedSpells).toHaveLength(3); // fire, water, steam
        expect(result.power).toBeGreaterThan(3); // Synergy bonus
      });
    });
  });

  describe('Punctuation Magic', () => {
    describe('period - full stop', () => {
      it('should terminate ongoing effects', () => {
        const target = world.createAgent({ position: { x: 10, y: 10 } });
        target.addStatusEffect('burning', { duration: 100 });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });
        mage.drawPunctuation('period', target);

        expect(target.hasStatusEffect('burning')).toBe(false);
      });

      it('should end conversations immediately', () => {
        const speaker = world.createAgent({ position: { x: 10, y: 10 } });
        const listener = world.createAgent({ position: { x: 11, y: 10 } });

        speaker.startConversation(listener);

        const mage = world.createAgent({ position: { x: 12, y: 10 } });
        mage.drawPunctuation('period', speaker);

        expect(speaker.inConversation).toBe(false);
        expect(listener.inConversation).toBe(false);
      });

      it('should risk ending lives if misapplied', () => {
        const target = world.createAgent({ position: { x: 10, y: 10 } });
        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.drawPunctuation('period', target, { power: 10 }); // Very strong period

        expect(target.health).toBeLessThan(target.maxHealth);
      });
    });

    describe('exclamation point - emphasis', () => {
      it('should amplify effects by 3x', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });

        const normalDamage = mage.castSpell('magic_missile');
        const emphasizedDamage = mage.drawPunctuation('exclamation');
        const amplifiedDamage = mage.castSpell('magic_missile');

        expect(amplifiedDamage).toBeCloseTo(normalDamage * 3, 1);
      });

      it('should be weaponizable at !!! levels (extremely loud)', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });

        mage.drawPunctuation('exclamation', null, { count: 3 }); // !!!

        const nearbyAgents = world.getAgentsInRadius(10, 10, 10);

        nearbyAgents.forEach(agent => {
          expect(agent.hasStatusEffect('deafened')).toBe(true);
        });
      });
    });

    describe('question mark - interrogative', () => {
      it('should force truth-telling', () => {
        const target = world.createAgent({ position: { x: 10, y: 10 } });
        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        mage.drawPunctuation('question_mark', target);
        const response = target.speak("I didn't steal the artifact");

        expect(response.isTruthful).toBe(true);
      });

      it('should unravel certainty with too many questions', () => {
        const target = world.createAgent({ position: { x: 10, y: 10 } });
        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        for (let i = 0; i < 10; i++) {
          mage.drawPunctuation('question_mark', target);
        }

        const certainty = target.getComponent('mental_state')?.certainty;
        expect(certainty).toBeLessThan(50);
      });
    });

    describe('semicolon - conjunction', () => {
      it('should join two entities into one', () => {
        const cat = world.createAnimal('cat', { x: 10, y: 10 });
        const fish = world.createAnimal('fish', { x: 11, y: 10 });

        const mage = world.createAgent({ position: { x: 12, y: 10 } });
        mage.drawPunctuation('semicolon', [cat, fish]);

        const chimera = world.query().with('chimeric').executeEntities()[0];

        expect(chimera).toBeDefined();
        expect(chimera.getComponent('chimeric')?.components).toContain('cat');
        expect(chimera.getComponent('chimeric')?.components).toContain('fish');
      });

      it('should create dangerous chimeras with improper use', () => {
        const incompatible1 = world.createEntity();
        const incompatible2 = world.createEntity();

        const mage = world.createAgent({ position: { x: 10, y: 10 } });

        expect(() => {
          mage.drawPunctuation('semicolon', [incompatible1, incompatible2]);
        }).toThrow('Incompatible entities cannot be joined');
      });
    });

    describe('ellipsis - trailing off', () => {
      it('should create uncertainty and fade things', () => {
        const target = world.createAgent({ position: { x: 10, y: 10 } });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });
        mage.drawPunctuation('ellipsis', target);

        const opacity = target.getComponent('visual')?.opacity;
        expect(opacity).toBeLessThan(1.0);
      });

      it('should lead to existential dissolution with overuse', () => {
        const target = world.createAgent({ position: { x: 10, y: 10 } });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });

        for (let i = 0; i < 10; i++) {
          mage.drawPunctuation('ellipsis', target);
        }

        const existence = target.getComponent('existence')?.strength;
        expect(existence).toBeLessThan(0.5);
      });
    });

    describe('em dash - interruption', () => {
      it('should cut through anything as literal cutting tool', () => {
        const wall = world.placeWallTile(10, 10, {
          materialId: 'stone_wall',
          health: 100,
          progress: 100,
          constructedAt: 0,
          orientation: 'north'
        });

        const mage = world.createAgent({ position: { x: 11, y: 10 } });
        mage.drawPunctuation('em_dash', { x: 10, y: 10 });

        const tile = world.getTileAt(10, 10);
        expect(tile.wall).toBeUndefined(); // Cut through
      });
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw if trying to create word with invalid string', () => {
      expect(() => {
        world.createWordEntity('', { x: 10, y: 10, z: 1 });
      }).toThrow('Cannot create word entity from empty string');
    });

    it('should throw if metaphor detection fails with non-string input', () => {
      expect(() => {
        world.detectMetaphor(123 as any);
      }).toThrow('Metaphor detection requires string input');
    });

    it('should throw if literalizing metaphor without valid target', () => {
      const metaphor = { phrase: 'sharp as a tack', tenor: 'he', vehicle: 'tack' };

      expect(() => {
        world.literalizeMetaphor(null, metaphor);
      }).toThrow('Metaphor requires valid target entity or world context');
    });

    it('should throw if drawing punctuation with insufficient calligraphy skill', () => {
      const novice = world.createAgent({ position: { x: 10, y: 10 } });
      novice.skills.calligraphy = 0;

      expect(() => {
        novice.drawPunctuation('em_dash');
      }).toThrow('Insufficient calligraphy skill to draw em_dash');
    });
  });
});
