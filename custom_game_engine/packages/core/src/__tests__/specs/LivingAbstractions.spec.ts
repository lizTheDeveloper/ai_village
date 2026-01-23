import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';

/**
 * Living Abstractions System Specifications
 *
 * Concepts and ideas given physical form. You can trip over Tuesday, taste regret,
 * or shake hands with the number seven.
 *
 * Inspired by literary surrealism where abstract concepts become tangible entities.
 * Emotions can be bottled and sold. Mathematical concepts negotiate. Days of the week
 * have turf wars. Colors debate aesthetics.
 *
 * See: architecture/LITERARY_SURREALISM_SPEC.md Section 3
 */
describe('Living Abstractions System', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Tangible Emotions', () => {
    describe('emotional entity creation', () => {
      it('should create regret as gray mist that follows you', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        agent.makePoorChoice('abandon_quest');

        const regret = world.query()
          .with('emotional_entity')
          .where(e => e.getComponent('emotional_entity').emotionType === 'regret')
          .executeEntities()[0];

        expect(regret).toBeDefined();
        expect(regret.getComponent('appearance')?.description).toContain('gray mist');
        expect(regret.getComponent('following')?.targetId).toBe(agent.id);
      });

      it('should create schadenfreude as imp with malicious grin', () => {
        const victim = world.createAgent({ position: { x: 10, y: 10 } });
        const witness = world.createAgent({ position: { x: 11, y: 10 } });

        victim.slip(); // Embarrassing fall

        const schadenfreude = world.query()
          .with('emotional_entity')
          .where(e => e.getComponent('emotional_entity').emotionType === 'schadenfreude')
          .executeEntities()[0];

        expect(schadenfreude).toBeDefined();
        expect(schadenfreude.getComponent('appearance')?.description).toContain('imp');
        expect(schadenfreude.getComponent('appearance')?.description).toContain('malicious grin');
      });

      it('should create joy as bright floating orb', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        agent.achieveGoal('find_treasure');

        const joy = world.query()
          .with('emotional_entity')
          .where(e => e.getComponent('emotional_entity').emotionType === 'joy')
          .executeEntities()[0];

        expect(joy).toBeDefined();
        expect(joy.getComponent('position')?.z).toBeGreaterThan(0); // Floating
      });
    });

    describe('emotional auras', () => {
      it('should make regret replay past decisions in your mind', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const regret = world.createEmotionalEntity('regret', { x: 10, y: 10 });

        world.tick(10); // Aura takes effect

        const memories = agent.getComponent('memory')?.getRecent();
        const regretfulMemories = memories?.filter(m => m.type === 'regret_replay');

        expect(regretfulMemories?.length).toBeGreaterThan(0);
      });

      it('should make schadenfreude amplify others failures', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const schadenfreude = world.createEmotionalEntity('schadenfreude', { x: 10, y: 10 });

        agent.attemptTask('difficult_task');

        const perception = agent.getComponent('perception')?.getPerception('task_failure');

        expect(perception?.amplified).toBe(true);
        expect(perception?.humor).toBeGreaterThan(0);
      });

      it('should allow resisting personal-range auras', () => {
        const strongWilled = world.createAgent({ position: { x: 10, y: 10 } });
        strongWilled.skills.willpower = 10;

        const regret = world.createEmotionalEntity('regret', { x: 10, y: 10 });

        world.tick(10);

        const affected = strongWilled.hasStatusEffect('regret_aura');

        // Strong willpower should resist
        expect(affected).toBe(false);
      });
    });

    describe('emotional behaviors', () => {
      it('should make regret cling to beings who made poor choices', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const regret = world.createEmotionalEntity('regret', { x: 5, y: 5 });

        agent.makePoorChoice('betray_friend');

        world.tick(100); // Let regret find the agent

        const regretPos = regret.getComponent('position');
        const agentPos = agent.getComponent('position');

        const distance = Math.hypot(regretPos.x - agentPos.x, regretPos.y - agentPos.y);

        expect(distance).toBeLessThan(2); // Regret has followed
      });

      it('should make regret grow heavier with age', () => {
        const regret = world.createEmotionalEntity('regret', { x: 10, y: 10 });

        const initialMass = regret.getComponent('emotional_entity')?.mass;

        world.tick(10000); // Long time passes

        const finalMass = regret.getComponent('emotional_entity')?.mass;

        expect(finalMass).toBeGreaterThan(initialMass ?? 0);
      });

      it('should allow shedding regret through atonement', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const regret = world.createEmotionalEntity('regret', { x: 10, y: 10 });

        agent.atone('betray_friend');

        expect(world.entities.has(regret.id)).toBe(false); // Regret dissipated
      });

      it('should make schadenfreude multiply in presence of social disasters', () => {
        const party = world.createEvent('social_gathering', { x: 20, y: 20 });
        const schadenfreude = world.createEmotionalEntity('schadenfreude', { x: 20, y: 20 });

        party.triggerDisaster('spilled_wine_on_host');

        world.tick(10);

        const schadenfreudeCount = world.query()
          .with('emotional_entity')
          .where(e => e.getComponent('emotional_entity').emotionType === 'schadenfreude')
          .executeEntities().length;

        expect(schadenfreudeCount).toBeGreaterThan(1); // Multiplied
      });
    });

    describe('emotional economics', () => {
      it('should allow bottling and selling emotions', () => {
        const joy = world.createEmotionalEntity('joy', { x: 10, y: 10 });
        const merchant = world.createAgent({ position: { x: 10, y: 10 } });

        merchant.bottleEmotion(joy);

        const bottle = merchant.inventory.getItem('bottled_joy');

        expect(bottle).toBeDefined();
        expect(bottle.tradeable).toBe(true);
        expect(bottle.value).toBeGreaterThan(0);
      });

      it('should make joy expensive and sorrow cheap', () => {
        const joy = world.createEmotionalEntity('joy', { x: 10, y: 10 });
        const sorrow = world.createEmotionalEntity('sorrow', { x: 11, y: 10 });

        expect(joy.getComponent('emotional_entity')?.value).toBeGreaterThan(
          sorrow.getComponent('emotional_entity')?.value ?? 0
        );
      });

      it('should create black market for schadenfreude dealers', () => {
        const dealer = world.createAgent({ position: { x: 10, y: 10 } });
        dealer.profession = 'emotion_dealer';

        const schadenfreude = world.createEmotionalEntity('schadenfreude', { x: 10, y: 10 });
        dealer.bottleEmotion(schadenfreude);

        const market = world.getBlackMarket();
        const listing = market.findListing('bottled_schadenfreude');

        expect(listing).toBeDefined();
        expect(listing?.isIllegal).toBe(false); // Legal but unseemly
      });

      it('should assign negative value to regret (people pay to remove it)', () => {
        const regret = world.createEmotionalEntity('regret', { x: 10, y: 10 });

        const value = regret.getComponent('emotional_entity')?.value;

        expect(value).toBeLessThan(0);
      });

      it('should model therapy as exorcising unwanted emotional entities', () => {
        const patient = world.createAgent({ position: { x: 10, y: 10 } });
        const regret = world.createEmotionalEntity('regret', { x: 10, y: 10 });
        regret.getComponent('following')?.setTarget(patient);

        const therapist = world.createAgent({ position: { x: 11, y: 10 } });
        therapist.profession = 'therapist';

        therapist.performTherapy(patient);

        expect(world.entities.has(regret.id)).toBe(false); // Exorcised
      });
    });
  });

  describe('Concept Creatures', () => {
    describe('temporal concepts', () => {
      it('should create Tuesday as bland humanoid in business casual', () => {
        const tuesday = world.createConceptBeing('tuesday');

        expect(tuesday.getComponent('appearance')?.description).toContain('bland');
        expect(tuesday.getComponent('appearance')?.description).toContain('business casual');
        expect(tuesday.getComponent('concept_being')?.concept).toBe('tuesday');
      });

      it('should make Tuesday wander between Monday and Wednesday', () => {
        const tuesday = world.createConceptBeing('tuesday');

        world.tick(100);

        const behavior = tuesday.getComponent('ai_behavior')?.currentBehavior;

        expect(behavior).toBe('wander_between_temporal_neighbors');
      });

      it('should make touching Tuesday change the day to Tuesday', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const tuesday = world.createConceptBeing('tuesday', { x: 10, y: 10 });

        agent.touch(tuesday);

        const currentDay = world.getComponent('time')?.dayOfWeek;

        expect(currentDay).toBe('tuesday');
      });

      it('should make Tuesday mundane and forgettable', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const tuesday = world.createConceptBeing('tuesday', { x: 10, y: 10 });

        agent.interact(tuesday);
        world.tick(10);

        const memory = agent.getComponent('memory')?.recall('tuesday_interaction');

        expect(memory).toBeUndefined(); // Immediately forgotten
      });
    });

    describe('numerical concepts', () => {
      it('should create the number seven as heptagonal crystal', () => {
        const seven = world.createConceptBeing('seven');

        expect(seven.getComponent('appearance')?.shape).toBe('heptagon');
        expect(seven.getComponent('appearance')?.material).toBe('crystal');
      });

      it('should make seven appear in groups of seven', () => {
        world.createConceptBeing('seven', { x: 10, y: 10 });

        world.tick(100); // Let manifestation complete

        const sevens = world.query()
          .with('concept_being')
          .where(e => e.getComponent('concept_being').concept === 'seven')
          .executeEntities();

        expect(sevens).toHaveLength(7);
      });

      it('should give seven of something when touched', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const seven = world.createConceptBeing('seven', { x: 10, y: 10 });

        agent.touch(seven);

        const inventoryItems = agent.inventory.getAllItems();
        const newItem = inventoryItems.find(item => item.count === 7);

        expect(newItem).toBeDefined();
      });

      it('should make seven answer in seven-word sentences', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const seven = world.createConceptBeing('seven', { x: 10, y: 10 });

        const response = agent.askQuestion(seven, "What is your nature?");

        const wordCount = response.split(' ').length;

        expect(wordCount).toBe(7);
      });
    });

    describe('color concepts', () => {
      it('should create disappointment blue as washed-out transparent figure', () => {
        const disappointmentBlue = world.createConceptBeing('disappointment_blue');

        expect(disappointmentBlue.getComponent('visual')?.color).toMatch(/blue.*gray/i);
        expect(disappointmentBlue.getComponent('visual')?.opacity).toBeLessThan(1.0);
      });

      it('should make disappointment blue appear when hopes are dashed', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        agent.hopeFor('treasure');
        agent.findNothing();

        const disappointmentBlue = world.query()
          .with('concept_being')
          .where(e => e.getComponent('concept_being').concept === 'disappointment_blue')
          .executeEntities()[0];

        expect(disappointmentBlue).toBeDefined();
        expect(disappointmentBlue.getComponent('position')?.x).toBeCloseTo(10, 1);
      });

      it('should paint things in disappointment blue when touched', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const disappointmentBlue = world.createConceptBeing('disappointment_blue', { x: 10, y: 10 });

        agent.touch(disappointmentBlue);

        const agentColor = agent.getComponent('visual')?.tint;

        expect(agentColor).toContain('blue');
      });

      it('should fade disappointment blue gradually as you move on', () => {
        const disappointmentBlue = world.createConceptBeing('disappointment_blue', { x: 10, y: 10 });

        const initialOpacity = disappointmentBlue.getComponent('visual')?.opacity;

        world.tick(1000); // Time passes

        const finalOpacity = disappointmentBlue.getComponent('visual')?.opacity;

        expect(finalOpacity).toBeLessThan(initialOpacity ?? 1);
      });
    });

    describe('concept interactions', () => {
      it('should make mathematical concepts negotiate with each other', () => {
        const seven = world.createConceptBeing('seven', { x: 10, y: 10 });
        const three = world.createConceptBeing('three', { x: 11, y: 10 });

        world.tick(100);

        const conversation = world.query()
          .with('conversation')
          .where(c =>
            c.getComponent('conversation').participants.includes(seven.id) &&
            c.getComponent('conversation').participants.includes(three.id)
          )
          .executeEntities()[0];

        expect(conversation).toBeDefined();
      });

      it('should create turf wars between days of the week', () => {
        const monday = world.createConceptBeing('monday', { x: 10, y: 10 });
        const friday = world.createConceptBeing('friday', { x: 11, y: 10 });

        world.tick(100);

        const conflict = world.query()
          .with('conflict')
          .where(c => c.getComponent('conflict').type === 'territory_dispute')
          .executeEntities()[0];

        expect(conflict).toBeDefined();
      });

      it('should allow tripping over Tuesday if lying in street', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const tuesday = world.createConceptBeing('tuesday', { x: 10, y: 10 });
        tuesday.setState('lying_down');

        agent.move(10, 10);

        expect(agent.hasStatusEffect('tripped')).toBe(true);
      });

      it('should make colors debate aesthetics', () => {
        const red = world.createConceptBeing('red', { x: 10, y: 10 });
        const blue = world.createConceptBeing('blue', { x: 11, y: 10 });

        world.tick(100);

        const debate = world.query()
          .with('philosophical_debate')
          .where(d => d.getComponent('philosophical_debate').topic === 'aesthetics')
          .executeEntities()[0];

        expect(debate).toBeDefined();
      });

      it('should allow abstract nouns to form governments', () => {
        const justice = world.createConceptBeing('justice', { x: 10, y: 10 });
        const liberty = world.createConceptBeing('liberty', { x: 11, y: 10 });
        const equality = world.createConceptBeing('equality', { x: 12, y: 10 });

        world.tick(1000); // Government formation takes time

        const government = world.query()
          .with('government')
          .where(g => g.getComponent('government').type === 'abstract_assembly')
          .executeEntities()[0];

        expect(government).toBeDefined();
        expect(government.getComponent('government')?.members).toContain(justice.id);
      });
    });

    describe('concept effects', () => {
      it('should create lucky coincidences near the number seven', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const seven = world.createConceptBeing('seven', { x: 10, y: 10 });

        const initialLuck = agent.getComponent('luck')?.value ?? 0;

        world.tick(10);

        const finalLuck = agent.getComponent('luck')?.value ?? 0;

        expect(finalLuck).toBeGreaterThan(initialLuck);
      });

      it('should cause mild bad luck when ignoring seven', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const seven = world.createConceptBeing('seven', { x: 10, y: 10 });

        agent.ignore(seven);

        world.tick(10);

        const luck = agent.getComponent('luck')?.value ?? 0;

        expect(luck).toBeLessThan(0);
      });

      it('should make everything tedious near Tuesday', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        const tuesday = world.createConceptBeing('tuesday', { x: 10, y: 10 });

        const task = agent.startTask('interesting_task');

        world.tick(10);

        expect(task.perceivedInterest).toBeLessThan(task.baseInterest);
      });
    });
  });

  describe('Ennui Epidemic', () => {
    it('should spread ennui in wealthy districts', () => {
      const wealthyDistrict = world.createDistrict('wealthy', { x: 50, y: 50, radius: 20 });

      world.tick(10000); // Time for ennui to develop

      const ennui = world.query()
        .with('emotional_entity')
        .where(e =>
          e.getComponent('emotional_entity').emotionType === 'ennui' &&
          wealthyDistrict.contains(e.getComponent('position'))
        )
        .executeEntities();

      expect(ennui.length).toBeGreaterThan(0);
    });

    it('should make ennui contagious in high concentration', () => {
      const agent1 = world.createAgent({ position: { x: 10, y: 10 } });
      const agent2 = world.createAgent({ position: { x: 11, y: 10 } });

      const ennui = world.createEmotionalEntity('ennui', { x: 10, y: 10 });

      world.tick(100);

      expect(agent1.hasStatusEffect('ennui')).toBe(true);
      expect(agent2.hasStatusEffect('ennui')).toBe(true);
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw if creating concept being with invalid concept', () => {
      expect(() => {
        world.createConceptBeing('');
      }).toThrow('Cannot create concept being from empty string');
    });

    it('should throw if bottling non-tradeable emotion', () => {
      const emotion = world.createEmotionalEntity('custom_emotion', { x: 10, y: 10 });
      emotion.getComponent('emotional_entity')!.tradeable = false;

      const merchant = world.createAgent({ position: { x: 10, y: 10 } });

      expect(() => {
        merchant.bottleEmotion(emotion);
      }).toThrow('Emotion is not tradeable');
    });

    it('should throw if attempting therapy without therapist skill', () => {
      const patient = world.createAgent({ position: { x: 10, y: 10 } });
      const faketherapist = world.createAgent({ position: { x: 11, y: 10 } });

      expect(() => {
        faketherapist.performTherapy(patient);
      }).toThrow('Agent lacks therapy skill');
    });

    it('should throw if touching non-existent concept being', () => {
      const agent = world.createAgent({ position: { x: 10, y: 10 } });

      expect(() => {
        agent.touch({ id: 'nonexistent' } as Entity);
      }).toThrow('Entity does not exist');
    });
  });
});
