import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';

/**
 * Story Leakage System Specifications
 *
 * Fictional entities escaping into reality. Unfinished characters wander in from
 * abandoned novels. Stories leak their genre into surrounding reality.
 *
 * A protagonist with no face (author never described it). A villain whose motivation
 * is just "TK TK fill in later". Horror stories contaminating reality with dread.
 * Romance novels making everything melodramatic.
 *
 * See: architecture/LITERARY_SURREALISM_SPEC.md Section 6
 */
describe('Story Leakage System', () => {
  let world: WorldImpl;

  beforeEach(() => {
    world = new WorldImpl();
  });

  describe('Unfinished Characters', () => {
    describe('character manifestation', () => {
      it('should create unfinished protagonist from abandoned novel', () => {
        const library = world.createBuilding('library', { x: 10, y: 10 });
        library.addBook({ title: 'Abandoned Epic', year: 1873, completionPercent: 32 });

        world.tick(100); // Story leaks out

        const protagonist = world.query()
          .with('unfinished_character')
          .executeEntities()[0];

        expect(protagonist).toBeDefined();
        expect(protagonist.getComponent('unfinished_character')?.sourceStory).toBe('Abandoned Epic');
        expect(protagonist.getComponent('unfinished_character')?.completionPercent).toBe(32);
      });

      it('should have defined traits from what author wrote', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Unfinished Tale',
          completionPercent: 40,
          definedTraits: ['brave', 'tall', 'has_sword'],
        });

        expect(character.getComponent('personality')?.traits).toContain('brave');
        expect(character.getComponent('body')?.height).toBeGreaterThan(180);
        expect(character.inventory.hasItem('sword')).toBe(true);
      });

      it('should have undefined aspects causing glitches', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Incomplete Story',
          completionPercent: 30,
          definedTraits: ['tall'],
          undefinedAspects: ['face', 'motivation', 'hands'],
        });

        expect(character.getComponent('appearance')?.face).toBe('blur');
        expect(character.getComponent('personality')?.motivation).toBeUndefined();
        expect(character.getComponent('body')?.hands).toBeUndefined();
      });
    });

    describe('undefined aspect glitches', () => {
      it('should make face blur when not described', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Novel Fragment',
          completionPercent: 25,
          undefinedAspects: ['face'],
        });

        const appearance = character.getComponent('appearance')?.face;

        expect(appearance).toBe('blur');
      });

      it('should make hands disappear when not in use', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Novel Fragment',
          completionPercent: 25,
          undefinedAspects: ['hands'],
        });

        world.tick(10); // Character not using hands

        const hands = character.getComponent('body')?.getPart('hands');

        expect(hands?.visible).toBe(false);
      });

      it('should show placeholder text for unknown backstory', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Novel Fragment',
          completionPercent: 25,
          undefinedAspects: ['backstory'],
        });

        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const response = agent.askAbout(character, 'your past');

        expect(response).toContain('TK TK');
      });

      it('should cause glitches during interaction (hand disappears mid-handshake)', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Novel Fragment',
          completionPercent: 25,
          undefinedAspects: ['hands'],
        });

        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        expect(() => {
          agent.handshake(character);
        }).toThrow('Hand disappeared during handshake');
      });
    });

    describe('completion mechanics', () => {
      it('should allow characters to seek completion from author', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Incomplete Novel',
          completionPercent: 50,
          undefinedAspects: ['motivation', 'goal'],
        });

        character.getComponent('unfinished_character')!.seekingCompletion = true;

        world.tick(100);

        const behavior = character.getComponent('ai_behavior')?.currentBehavior;

        expect(behavior).toBe('seek_author');
      });

      it('should gradually become real through lived experience', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Incomplete Novel',
          completionPercent: 50,
          undefinedAspects: ['motivation'],
        });

        character.getComponent('unfinished_character')!.becomingReal = true;

        const initialCompletion = character.getComponent('unfinished_character')?.completionPercent;

        // Live many experiences
        for (let i = 0; i < 100; i++) {
          character.experience('meaningful_event');
        }

        const finalCompletion = character.getComponent('unfinished_character')?.completionPercent;

        expect(finalCompletion).toBeGreaterThan(initialCompletion ?? 0);
      });

      it('should allow completion through ritual authorship', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Incomplete Novel',
          completionPercent: 70,
          undefinedAspects: ['face', 'backstory'],
        });

        const author = world.createAgent({ position: { x: 10, y: 10 } });
        author.profession = 'writer';

        author.performRitualAuthorship(character, {
          face: 'weathered with kind eyes',
          backstory: 'former soldier seeking redemption',
        });

        expect(character.getComponent('unfinished_character')?.completionPercent).toBe(100);
        expect(character.getComponent('appearance')?.face).not.toBe('blur');
      });

      it('should allow characters to prefer remaining sketches (definition is limiting)', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Philosophical Fragment',
          completionPercent: 40,
          undefinedAspects: ['many_things'],
        });

        character.getComponent('unfinished_character')!.seekingCompletion = false;

        const author = world.createAgent({ position: { x: 10, y: 10 } });

        expect(() => {
          author.performRitualAuthorship(character, { many_things: 'defined' });
        }).toThrow('Character refuses completion');
      });
    });

    describe('sword vagueness', () => {
      it('should make sword sometimes change when not clearly defined', () => {
        const character = world.createUnfinishedCharacter({
          sourceStory: 'Vague Epic',
          completionPercent: 30,
          definedTraits: ['has_sword_vague'],
        });

        const initialSword = character.inventory.getItem('sword');
        const initialType = initialSword?.type;

        world.tick(1000);

        const finalSword = character.inventory.getItem('sword');
        const finalType = finalSword?.type;

        expect(finalType).not.toBe(initialType); // Sword changed
      });
    });
  });

  describe('Genre Contamination', () => {
    describe('horror genre aura', () => {
      it('should create horror aura around horror stories', () => {
        const horrorBook = world.createBook('Gothic Terror', { x: 10, y: 10 });
        horrorBook.getComponent('book')!.genre = 'horror';

        world.tick(100); // Genre leaks

        const aura = world.query()
          .with('genre_aura')
          .where(e => e.getComponent('genre_aura').genre === 'horror')
          .executeEntities()[0];

        expect(aura).toBeDefined();
        expect(aura.getComponent('genre_aura')?.radius).toBeGreaterThan(0);
      });

      it('should make shadows move independently in horror aura', () => {
        const horrorAura = world.createGenreAura('horror', { x: 10, y: 10, radius: 50 });

        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        world.tick(10);

        const shadow = agent.getComponent('shadow');

        expect(shadow?.movesIndependently).toBe(true);
      });

      it('should create cold spots in horror aura', () => {
        const horrorAura = world.createGenreAura('horror', { x: 10, y: 10, radius: 50 });

        world.tick(10);

        const temperature = world.getTemperatureAt(10, 10);
        const baselineTemp = world.getTemperatureAt(100, 100); // Outside aura

        expect(temperature).toBeLessThan(baselineTemp);
      });

      it('should increase dread and paranoia in horror aura', () => {
        const horrorAura = world.createGenreAura('horror', { x: 10, y: 10, radius: 50 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        world.tick(100);

        expect(agent.emotions.dread).toBeGreaterThan(0);
        expect(agent.emotions.paranoia).toBeGreaterThan(0);
      });

      it('should make everyone speak in ominous foreshadowing', () => {
        const horrorAura = world.createGenreAura('horror', { x: 10, y: 10, radius: 50 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        const speech = agent.speak("Nice weather today");

        expect(speech.tone).toBe('ominous');
        expect(speech.text).toContain('...but for how long?');
      });

      it('should intensify Murphy\'s law (everything goes wrong)', () => {
        const horrorAura = world.createGenreAura('horror', { x: 10, y: 10, radius: 50 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        const successRate = agent.attemptTasks(100);

        expect(successRate).toBeLessThan(0.3); // Most things go wrong
      });
    });

    describe('romance genre aura', () => {
      it('should create soft focus lighting in romance aura', () => {
        const romanceAura = world.createGenreAura('romance', { x: 10, y: 10, radius: 30 });

        world.tick(10);

        const lighting = world.getLightingAt(10, 10);

        expect(lighting.softFocus).toBe(true);
      });

      it('should make wind tousle hair dramatically', () => {
        const romanceAura = world.createGenreAura('romance', { x: 10, y: 10, radius: 30 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        world.tick(10);

        const hair = agent.getComponent('appearance')?.hair;

        expect(hair?.tousled).toBe(true);
        expect(hair?.dramatic).toBe(true);
      });

      it('should heighten emotions and passionate declarations', () => {
        const romanceAura = world.createGenreAura('romance', { x: 10, y: 10, radius: 30 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        const speech = agent.speak("I like you");

        expect(speech.emotional_intensity).toBeGreaterThan(5);
        expect(speech.text).toContain('love');
      });

      it('should make everyone speak in double entendres', () => {
        const romanceAura = world.createGenreAura('romance', { x: 10, y: 10, radius: 30 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        const speech = agent.speak("Would you like to come in for coffee?");

        expect(speech.hasSubtext).toBe(true);
        expect(speech.subtextMeaning).not.toBe('literal coffee');
      });

      it('should increase coincidental meetings', () => {
        const romanceAura = world.createGenreAura('romance', { x: 10, y: 10, radius: 30 });
        const agent1 = world.createAgent({ position: { x: 10, y: 10 } });
        const agent2 = world.createAgent({ position: { x: 30, y: 30 } }); // Far away

        world.tick(100);

        const distance = Math.hypot(
          agent1.getComponent('position').x - agent2.getComponent('position').x,
          agent1.getComponent('position').y - agent2.getComponent('position').y
        );

        expect(distance).toBeLessThan(5); // "Coincidentally" met
      });
    });

    describe('noir genre aura', () => {
      it('should make everything black and white in noir aura', () => {
        const noirAura = world.createGenreAura('noir', { x: 10, y: 10, radius: 40 });

        world.tick(10);

        const colorMode = world.getColorModeAt(10, 10);

        expect(colorMode).toBe('grayscale');
      });

      it('should create dramatic shadows and cigarette smoke', () => {
        const noirAura = world.createGenreAura('noir', { x: 10, y: 10, radius: 40 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        world.tick(10);

        expect(agent.getComponent('shadow')?.dramatic).toBe(true);
        expect(world.getAmbientSmokeAt(10, 10)).toBeGreaterThan(0);
      });

      it('should make dialogue cynical and hard-boiled', () => {
        const noirAura = world.createGenreAura('noir', { x: 10, y: 10, radius: 40 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        const speech = agent.speak("Good morning");

        expect(speech.tone).toBe('cynical');
        expect(speech.text).toContain('dame' || 'case' || 'gumshoe');
      });
    });

    describe('comedy genre aura', () => {
      it('should increase pratfall likelihood in comedy aura', () => {
        const comedyAura = world.createGenreAura('comedy', { x: 10, y: 10, radius: 30 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        let pratfalls = 0;
        for (let i = 0; i < 100; i++) {
          if (agent.walk()) {
            // Successfully walked
          } else {
            pratfalls++;
          }
        }

        expect(pratfalls).toBeGreaterThan(10); // Many pratfalls
      });

      it('should make timing comedic (everything happens at worst/best moment)', () => {
        const comedyAura = world.createGenreAura('comedy', { x: 10, y: 10, radius: 30 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        agent.startImportantSpeech();

        world.tick(1); // Immediately

        expect(agent.hasStatusEffect('pants_fell_down')).toBe(true); // Perfect comedic timing
      });
    });

    describe('cosmic horror genre aura', () => {
      it('should reveal incomprehensible geometries', () => {
        const cosmicHorrorAura = world.createGenreAura('cosmic_horror', { x: 10, y: 10, radius: 50 });

        world.tick(10);

        const geometry = world.getGeometryAt(10, 10);

        expect(geometry.euclidean).toBe(false);
        expect(geometry.comprehensible).toBe(false);
      });

      it('should cause sanity damage from understanding too much', () => {
        const cosmicHorrorAura = world.createGenreAura('cosmic_horror', { x: 10, y: 10, radius: 50 });
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        agent.contemplateTheVoid();

        expect(agent.sanity).toBeLessThan(agent.maxSanity);
      });
    });
  });

  describe('Genre Mixing', () => {
    it('should create bizarre effects when genres overlap', () => {
      const horrorAura = world.createGenreAura('horror', { x: 10, y: 10, radius: 50 });
      const romanceAura = world.createGenreAura('romance', { x: 10, y: 10, radius: 50 });

      const agent = world.createAgent({ position: { x: 10, y: 10 } });

      const speech = agent.speak("I love you");

      // Romantic speech in horror context
      expect(speech.text).toContain('love');
      expect(speech.tone).toBe('ominous');
      expect(speech.unsettling).toBe(true);
    });

    it('should allow dominant genre to override weaker genres', () => {
      const weakRomance = world.createGenreAura('romance', { x: 10, y: 10, radius: 30, strength: 0.3 });
      const strongHorror = world.createGenreAura('horror', { x: 10, y: 10, radius: 30, strength: 0.9 });

      const dominantGenre = world.getDominantGenreAt(10, 10);

      expect(dominantGenre).toBe('horror');
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw if creating unfinished character with no source story', () => {
      expect(() => {
        world.createUnfinishedCharacter({
          sourceStory: '',
          completionPercent: 50,
          definedTraits: [],
        });
      }).toThrow('Unfinished character requires source story');
    });

    it('should throw if completion percent is invalid', () => {
      expect(() => {
        world.createUnfinishedCharacter({
          sourceStory: 'Test Story',
          completionPercent: 150, // Invalid
          definedTraits: [],
        });
      }).toThrow('Completion percent must be between 0 and 100');
    });

    it('should throw if creating genre aura with invalid genre', () => {
      // Test that runtime validation rejects invalid genre types
      // TypeScript correctly prevents this at compile-time, but we need to test runtime validation
      // for cases where data might come from external sources (saved games, network, etc.)
      // Using unknown → string to explicitly bypass type safety for testing
      const invalidGenre: unknown = 'invalid_genre';

      expect(() => {
        world.createGenreAura(invalidGenre as string, { x: 10, y: 10, radius: 30 });
      }).toThrow('Unknown genre: invalid_genre');
    });

    it('should throw if ritual authorship attempted by non-writer', () => {
      const character = world.createUnfinishedCharacter({
        sourceStory: 'Test',
        completionPercent: 50,
        undefinedAspects: ['face'],
      });

      const nonWriter = world.createAgent({ position: { x: 10, y: 10 } });

      expect(() => {
        nonWriter.performRitualAuthorship(character, { face: 'complete' });
      }).toThrow('Only writers can perform ritual authorship');
    });
  });
});
