/**
 * DeathBargainSystem - Handles hero challenges to cheat death
 *
 * When a hero with a grand destiny dies, the God of Death may offer them
 * a challenge to return to life. Inspired by myths like:
 * - The Sphinx riddle (Oedipus)
 * - Orpheus and Eurydice (musical challenge)
 * - Sisyphus (talked his way out of death twice)
 * - Hercules wrestling Death
 *
 * Currently implements:
 * - Riddle challenges (with LLM answer evaluation)
 * - Mythic riddles from classical sources
 * - Dynamic riddle generation based on hero's life
 */

import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { LLMProvider } from '@ai-village/llm';
import {
  type DeathBargainComponent,
  type ChallengeType,
  createDeathBargainComponent,
  MYTHIC_RIDDLES,
} from '../components/DeathBargainComponent.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';
import type { AfterlifeComponent } from '../components/AfterlifeComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import { RiddleGenerator, type HeroContext } from '../divinity/RiddleGenerator.js';
import {
  createGodOfDeath,
  findGodOfDeath,
  moveGodOfDeath,
} from '../divinity/GodOfDeathEntity.js';

/**
 * DeathBargainSystem - Offers dying heroes a chance to return
 */
export class DeathBargainSystem implements System {
  readonly id: SystemId = 'death_bargain';
  readonly priority: number = 120; // After death transition
  readonly requiredComponents = [ComponentType.DeathBargain] as const;

  private llmProvider?: LLMProvider;
  private riddleGenerator?: RiddleGenerator;
  private useLLM: boolean = true;
  private useGeneratedRiddles: boolean = false; // Default to mythic riddles for stability

  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
    this.riddleGenerator = new RiddleGenerator(provider);
  }

  setUseLLM(enabled: boolean): void {
    this.useLLM = enabled;
  }

  setUseGeneratedRiddles(enabled: boolean): void {
    this.useGeneratedRiddles = enabled;
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const bargain = entity.getComponent(ComponentType.DeathBargain) as DeathBargainComponent;

      // Process based on current status
      if (bargain.status === 'offered') {
        // Waiting for hero to accept/decline
        // This is handled by agent decision-making or player input
        continue;
      }

      if (bargain.status === 'accepted' && bargain.challengeDescription === '') {
        // Generate the challenge
        this.generateChallenge(world, entity, bargain);
      }

      if (bargain.status === 'in_progress' && bargain.heroResponse) {
        // Evaluate hero's answer
        this.evaluateResponse(world, entity, bargain);
      }

      if (bargain.status === 'succeeded') {
        // Resurrect the hero
        this.resurrectHero(world, entity, bargain);
      }

      if (bargain.status === 'failed') {
        // Final death
        this.finalDeath(world, entity, bargain);
      }
    }
  }

  /**
   * Check if an entity qualifies for a death bargain
   */
  qualifiesForDeathBargain(entity: Entity): boolean {
    // Must have a soul
    const soulIdentity = entity.components.get('soul_identity') as SoulIdentityComponent | undefined;
    if (!soulIdentity) {
      return false;
    }

    // Check for grand destiny
    const hasGrandDestiny = this.hasGrandDestiny(soulIdentity.destiny);
    if (!hasGrandDestiny) {
      return false;
    }

    // Check for hero status (combat skill, achievements, etc.)
    const isHero = this.isHero(entity);
    if (!isHero) {
      return false;
    }

    // God of Death's whim (50% chance for dramatic effect)
    return Math.random() < 0.5;
  }

  /**
   * Check if a destiny is "grand" enough
   */
  private hasGrandDestiny(destiny: string | undefined): boolean {
    if (!destiny) {
      return false;
    }

    const grandKeywords = [
      'unite',
      'save',
      'legendary',
      'great',
      'defeat',
      'conquer',
      'lead',
      'champion',
      'protect',
      'sacrifice',
    ];

    const lowerDest = destiny.toLowerCase();
    return grandKeywords.some(keyword => lowerDest.includes(keyword));
  }

  /**
   * Check if entity is a hero
   */
  private isHero(entity: Entity): boolean {
    // Check for combat skills
    const skills = entity.components.get('skills');
    if (skills && (skills as any).combat && (skills as any).combat > 5) {
      return true;
    }

    // Check for achievements/reputation
    const agent = entity.components.get('agent');
    if (agent && (agent as any).reputation && (agent as any).reputation > 10) {
      return true;
    }

    // Default: anyone who made it this far might be a hero
    return true;
  }

  /**
   * Offer a death bargain to a dying hero
   */
  offerDeathBargain(
    world: World,
    entity: Entity,
    deathLocation: { x: number; y: number },
    causeOfDeath: string
  ): void {
    const soulIdentity = entity.components.get('soul_identity') as SoulIdentityComponent | undefined;
    const destinyText = soulIdentity?.destiny;

    // Manifest or move the God of Death
    const deathGod = this.manifestGodOfDeath(world, deathLocation);
    const deathGodName = this.getDeathGodName(world);

    // Start observable conversation
    this.startDeathBargainConversation(world, deathGod, entity);

    // Choose challenge type (start with riddles)
    const challengeType: ChallengeType = 'riddle';

    // Create death bargain component
    const bargain = createDeathBargainComponent(
      challengeType,
      deathGodName,
      world.tick,
      deathLocation,
      causeOfDeath,
      destinyText
    );

    // Opening dialogue - visible to nearby agents
    const dialogue = [
      `Mortal, your thread was to be cut this day.`,
      `But I see in you a grand destiny yet unfulfilled...`,
      `"${destinyText}"`,
      `Perhaps you are not ready for the Underworld.`,
      `I will offer you a chance - solve my riddle, and you may return to life.`,
      `Fail, and you shall serve me in the realm of shades forever.`,
      `What say you?`,
    ];

    // Add to legacy dialogue array (for backwards compatibility)
    bargain.deathGodDialogue.push(...dialogue);

    // Add as observable conversation messages
    for (const line of dialogue) {
      this.addConversationMessage(world, deathGod, entity, line);
    }

    (entity as any).addComponent(bargain);

    // Emit event
    world.eventBus.emit({
      type: 'death:bargain_offered',
      source: 'death_bargain_system',
      data: {
        entityId: entity.id,
        deathGodId: deathGod.id,
        deathGodName,
        challengeType,
        destiny: destinyText,
        location: deathLocation,
      },
    });
  }

  /**
   * Generate the specific challenge
   */
  private generateChallenge(world: World, entity: Entity, bargain: DeathBargainComponent): void {
    if (bargain.challengeType === 'riddle') {
      this.generateRiddle(world, entity, bargain);
    }

    bargain.status = 'in_progress';
  }

  /**
   * Generate a riddle challenge
   */
  private async generateRiddle(
    world: World,
    entity: Entity,
    bargain: DeathBargainComponent
  ): Promise<void> {
    let riddleQuestion: string;
    let correctAnswer: string;
    let acceptedAnswers: string[];
    let hint: string | undefined;

    if (this.useGeneratedRiddles && this.riddleGenerator) {
      // Generate personalized riddle using LLM
      try {
        const heroContext = this.buildHeroContext(entity, bargain);
        const generatedRiddle = await this.riddleGenerator.generatePersonalizedRiddle(heroContext);

        riddleQuestion = generatedRiddle.question;
        correctAnswer = generatedRiddle.correctAnswer;
        acceptedAnswers = generatedRiddle.acceptedAnswers;
        hint = generatedRiddle.hint;
      } catch (error) {
        console.error('[DeathBargainSystem] Failed to generate personalized riddle, falling back to Sphinx:', error);
        // Fall back to Sphinx riddle
        const sphinxRiddle = MYTHIC_RIDDLES.sphinx;
        riddleQuestion = sphinxRiddle.question;
        correctAnswer = sphinxRiddle.correctAnswer;
        acceptedAnswers = [...sphinxRiddle.acceptedAnswers];
        hint = sphinxRiddle.hint;
      }
    } else {
      // Use classic Sphinx riddle
      const sphinxRiddle = MYTHIC_RIDDLES.sphinx;
      riddleQuestion = sphinxRiddle.question;
      correctAnswer = sphinxRiddle.correctAnswer;
      acceptedAnswers = [...sphinxRiddle.acceptedAnswers];
      hint = sphinxRiddle.hint;
    }

    bargain.riddle = {
      question: riddleQuestion,
      correctAnswer,
      acceptedAnswers,
      hint,
    };

    bargain.challengeDescription = `The God of Death speaks: "${riddleQuestion}"`;

    const riddleDialogue = [
      `Listen well, mortal.`,
      riddleQuestion,
      `Answer correctly, and I shall return you to the world of the living.`,
      `Answer wrongly, and your soul is mine.`,
    ];

    // Add to legacy dialogue array
    bargain.deathGodDialogue.push(...riddleDialogue);

    // Add as observable conversation messages
    const deathGod = findGodOfDeath(world);
    if (deathGod) {
      for (const line of riddleDialogue) {
        this.addConversationMessage(world, deathGod, entity, line);
      }
    }

    // Emit event
    world.eventBus.emit({
      type: 'death:challenge_started',
      source: 'death_bargain_system',
      data: {
        entityId: entity.id,
        challengeType: 'riddle',
        riddle: riddleQuestion,
      },
    });
  }

  /**
   * Build hero context for personalized riddle generation
   */
  private buildHeroContext(entity: Entity, bargain: DeathBargainComponent): HeroContext {
    const identity = entity.components.get('identity') as any;
    const soulIdentity = entity.components.get('soul_identity') as SoulIdentityComponent | undefined;
    const memories = entity.components.get('episodic_memory') as any;

    // Extract notable deeds from memories
    const notableDeeds: string[] = [];
    if (memories?.memories) {
      const memoryArray = Array.from(memories.memories as any[]);
      notableDeeds.push(
        ...memoryArray
          .filter((m: any) => m.importance && m.importance > 7)
          .map((m: any) => m.description)
          .slice(0, 3) // Top 3 most important memories
      );
    }

    return {
      name: identity?.name || 'Unknown Hero',
      destiny: soulIdentity?.destiny || bargain.destinyText,
      causeOfDeath: bargain.causeOfDeath,
      notableDeeds: notableDeeds.length > 0 ? notableDeeds : undefined,
    };
  }

  /**
   * Evaluate hero's response to the challenge
   */
  private async evaluateResponse(
    world: World,
    entity: Entity,
    bargain: DeathBargainComponent
  ): Promise<void> {
    if (!bargain.heroResponse) {
      return;
    }

    bargain.attempts++;

    if (bargain.challengeType === 'riddle') {
      // Get God of Death for conversation
      const deathGod = findGodOfDeath(world);

      // Hero's answer is observable
      if (deathGod) {
        this.addConversationMessage(world, entity, deathGod, bargain.heroResponse);
      }

      const correct = await this.evaluateRiddleAnswer(world, entity, bargain.heroResponse, bargain);

      if (correct) {
        bargain.succeeded = true;
        bargain.status = 'succeeded';

        const successDialogue = [
          `... Impressive.`,
          `You have answered correctly, mortal.`,
          `Your destiny is not yet complete.`,
          `Return to the world above - but know that you owe me a debt.`,
          `When I call upon you, you will answer.`,
        ];

        bargain.deathGodDialogue.push(...successDialogue);

        // Make judgment observable
        if (deathGod) {
          for (const line of successDialogue) {
            this.addConversationMessage(world, deathGod, entity, line);
          }
        }

        // Set resurrection conditions
        bargain.resurrectConditions = {
          healthPenalty: 0.2, // 20% max health penalty
          penaltyDuration: 7 * 24 * 60 * 60, // 7 days in ticks
          blessing: 'death_sight', // Can see ghosts
          debtOwed: 'When Death calls, you must answer',
        };

        world.eventBus.emit({
          type: 'death:challenge_succeeded',
          source: 'death_bargain_system',
          data: {
            entityId: entity.id,
            answer: bargain.heroResponse,
            attemptsUsed: bargain.attempts,
          },
        });
      } else {
        if (bargain.attempts >= bargain.maxAttempts) {
          // Failed permanently
          bargain.succeeded = false;
          bargain.status = 'failed';

          const failureDialogue = [
            `Wrong. You have failed, mortal.`,
            `Your soul is forfeit.`,
            `Welcome to eternal servitude in the Underworld.`,
          ];

          bargain.deathGodDialogue.push(...failureDialogue);

          // Make judgment observable
          if (deathGod) {
            for (const line of failureDialogue) {
              this.addConversationMessage(world, deathGod, entity, line);
            }
          }

          world.eventBus.emit({
            type: 'death:challenge_failed',
            source: 'death_bargain_system',
            data: {
              entityId: entity.id,
              finalAnswer: bargain.heroResponse,
              attemptsUsed: bargain.attempts,
            },
          });
        } else {
          // Give another chance
          const retryDialogue = [
            `Incorrect. But I am not without mercy.`,
            `You have ${bargain.maxAttempts - bargain.attempts} attempts remaining.`,
            `Think carefully...`,
          ];

          bargain.deathGodDialogue.push(...retryDialogue);

          // Make feedback observable
          if (deathGod) {
            for (const line of retryDialogue) {
              this.addConversationMessage(world, deathGod, entity, line);
            }
          }

          bargain.heroResponse = undefined; // Clear for next attempt
        }
      }
    }
  }

  /**
   * Evaluate a riddle answer using God of Death judgment mode
   * The God of Death considers observer context and judges theatrically
   */
  private async evaluateRiddleAnswer(
    world: World,
    entity: Entity,
    answer: string,
    bargain: DeathBargainComponent
  ): Promise<boolean> {
    if (!bargain.riddle) {
      return false;
    }

    // First check exact matches (fast path)
    const normalizedAnswer = answer.toLowerCase().trim();
    const correctAnswer = bargain.riddle.correctAnswer.toLowerCase();

    if (normalizedAnswer === correctAnswer) {
      return true;
    }

    // Check accepted alternatives
    if (bargain.riddle.acceptedAnswers) {
      for (const accepted of bargain.riddle.acceptedAnswers) {
        if (normalizedAnswer === accepted.toLowerCase()) {
          return true;
        }
      }
    }

    // Use judgment mode if riddleGenerator available
    if (this.riddleGenerator) {
      try {
        // Gather observer context
        const observerContext = this.getObserverContext(world, entity, bargain);

        // Convert bargain.riddle to GeneratedRiddle format
        const riddle = {
          question: bargain.riddle.question,
          correctAnswer: bargain.riddle.correctAnswer,
          acceptedAnswers: bargain.riddle.acceptedAnswers,
          hint: bargain.riddle.hint,
          difficulty: 'medium' as const,
          source: 'mythic' as const,
          useJudgment: true,
        };

        // God of Death judges the answer
        const judgment = await this.riddleGenerator.judgeAnswer(riddle, answer, {
          playerIsWatching: observerContext.playerIsWatching,
          witnessCount: observerContext.witnessCount,
          observingGods: observerContext.observingGods,
        });

        return judgment.accepted;
      } catch (error) {
        console.error('[DeathBargainSystem] Judgment mode failed:', error);
        // Fall back to exact matching
        return false;
      }
    }

    // Legacy fallback: Use basic LLM semantic matching
    if (this.useLLM && this.llmProvider) {
      try {
        const prompt = `You are evaluating whether a riddle answer is correct.

Riddle: "${bargain.riddle.question}"
Correct answer: "${bargain.riddle.correctAnswer}"
Hero's answer: "${answer}"

Is the hero's answer semantically equivalent to the correct answer?
Answer ONLY with "YES" or "NO".`;

        const response = await this.llmProvider.generate({
          prompt,
          temperature: 0.1, // Low temperature for consistent evaluation
          maxTokens: 10,
        });

        const evaluation = response.text.trim().toUpperCase();
        return evaluation.includes('YES');
      } catch (error) {
        console.error('[DeathBargainSystem] LLM evaluation failed:', error);
        // Fall back to exact matching
        return false;
      }
    }

    return false;
  }

  /**
   * Get observer context for death bargain judgment
   * More observers = more leniency (God of Death is theatrical!)
   */
  private getObserverContext(
    world: World,
    dyingEntity: Entity,
    bargain: DeathBargainComponent
  ): {
    playerIsWatching: boolean;
    witnessCount: number;
    observingGods: string[];
  } {
    // TODO: Check if player is watching (player interest/focus system)
    const playerIsWatching = false; // Placeholder

    // Count nearby mortal witnesses
    const witnessCount = this.countNearbyWitnesses(world, bargain.deathLocation);

    // Get names of gods observing in divine chat
    const observingGods = this.getObservingGods(world);

    return {
      playerIsWatching,
      witnessCount,
      observingGods,
    };
  }

  /**
   * Count mortals near death location who can witness the bargain
   */
  private countNearbyWitnesses(world: World, location: { x: number; y: number }): number {
    const WITNESS_RADIUS = 10; // Can witness from 10 tiles away
    let count = 0;

    // Query all entities with position
    const entities = world.query()
      .with(ComponentType.Position)
      .executeEntities();

    for (const entity of entities) {
      const pos = entity.getComponent(ComponentType.Position) as any;
      if (!pos) continue;

      // Check if entity is mortal (has agent component)
      const isAgent = entity.hasComponent(ComponentType.Agent);
      if (!isAgent) continue;

      // Check distance
      const dx = pos.x - location.x;
      const dy = pos.y - location.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= WITNESS_RADIUS * WITNESS_RADIUS) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get names of gods currently in divine chat observing
   * Uses ChatRoomSystem to get accurate list of gods in chat
   */
  private getObservingGods(world: World): string[] {
    // Try to get ChatRoomSystem from the world's system registry
    const systemRegistry = (world as any).systemRegistry;
    if (!systemRegistry) {
      return [];
    }

    const chatRoomSystem = systemRegistry.get('chat_rooms');
    if (!chatRoomSystem) {
      // ChatRoomSystem not registered yet - fallback to empty
      return [];
    }

    // Get members of the divine chat room
    const members = (chatRoomSystem as any).getRoomMembers(world, 'divine_chat');
    return members ? members.map((m: any) => m.name) : [];
  }

  /**
   * Resurrect the hero who succeeded
   */
  private resurrectHero(world: World, entity: Entity, bargain: DeathBargainComponent): void {
    // End the conversation
    const deathGod = findGodOfDeath(world);
    if (deathGod) {
      this.endDeathBargainConversation(deathGod, entity);
    }

    // Remove afterlife component if present
    (entity as any).removeComponent?.(ComponentType.Afterlife);

    // Apply health penalty if specified
    if (bargain.resurrectConditions?.healthPenalty) {
      const health = entity.components.get('health');
      if (health) {
        (health as any).max *= 1 - bargain.resurrectConditions.healthPenalty;
        (health as any).current = (health as any).max;
      }
    }

    // Add blessing
    if (bargain.resurrectConditions?.blessing) {
      const tags = entity.components.get('tags');
      if (tags && (tags as any).tags) {
        (tags as any).tags.add(bargain.resurrectConditions.blessing);
      }
    }

    // Return to location of death
    const position = entity.components.get('position');
    if (position) {
      (position as any).x = bargain.deathLocation.x;
      (position as any).y = bargain.deathLocation.y;
    }

    // Remove death bargain component (challenge complete)
    (entity as any).removeComponent?.(ComponentType.DeathBargain);

    world.eventBus.emit({
      type: 'agent:resurrected',
      source: 'death_bargain_system',
      data: {
        entityId: entity.id,
        resurrectionType: 'death_bargain',
        conditions: bargain.resurrectConditions,
      },
    });
  }

  /**
   * Handle final death after failed challenge
   */
  private finalDeath(world: World, entity: Entity, bargain: DeathBargainComponent): void {
    // End the conversation
    const deathGod = findGodOfDeath(world);
    if (deathGod) {
      this.endDeathBargainConversation(deathGod, entity);
    }

    // Update afterlife component with servitude status
    const afterlife = entity.components.get('afterlife') as AfterlifeComponent | undefined;
    if (afterlife) {
      afterlife.peace = 0; // No peace in servitude
      afterlife.isRestless = true;
      // Could add a servitude flag here
    }

    // Remove death bargain component
    (entity as any).removeComponent?.(ComponentType.DeathBargain);

    world.eventBus.emit({
      type: 'death:final',
      source: 'death_bargain_system',
      data: {
        entityId: entity.id,
        fate: 'servitude',
        failedChallenge: bargain.challengeType,
      },
    });
  }

  /**
   * Manifest or move the God of Death entity
   *
   * On first qualified death, creates the God of Death entity.
   * On subsequent deaths, moves existing God of Death to new location.
   *
   * @returns The God of Death entity
   */
  private manifestGodOfDeath(world: World, location: { x: number; y: number }): Entity {
    // Check if God of Death already exists
    let deathGod = findGodOfDeath(world);

    if (!deathGod) {
      // FIRST TIME - Create God of Death
      deathGod = createGodOfDeath(world, location);

      const identity = deathGod.components.get('identity') as any;
      const deathGodName = identity?.name || 'The God of Death';

      // Emit manifestation event - "The God of Death has entered the chat"
      world.eventBus.emit({
        type: 'deity:manifested',
        source: 'death_bargain_system',
        data: {
          deityId: deathGod.id,
          deityName: deathGodName,
          reason: 'first_ensouled_death',
          location: { x: location.x, y: location.y },
          message: `${deathGodName} has entered the chat`,
        },
      });

      console.error(`[DeathBargainSystem] ${deathGodName} manifested at (${location.x}, ${location.y})`);
    } else {
      // Move existing God of Death to death location
      moveGodOfDeath(deathGod, location);
    }

    return deathGod;
  }

  /**
   * Get the name of the God of Death
   */
  private getDeathGodName(world: World): string {
    const deathGod = findGodOfDeath(world);
    if (deathGod) {
      const identity = deathGod.components.get('identity') as any;
      return identity?.name || 'The God of Death';
    }
    return 'Thanatos'; // Fallback
  }

  /**
   * Add a message to the death bargain conversation
   * Makes the conversation observable by nearby agents
   */
  private addConversationMessage(
    world: World,
    speaker: Entity,
    listener: Entity,
    message: string
  ): void {
    // Add message to speaker's conversation component
    const speakerConv = speaker.components.get('conversation') as any;
    if (speakerConv) {
      speakerConv.partnerId = listener.id;
      speakerConv.isActive = true;
      speakerConv.lastMessageAt = world.tick;

      if (!speakerConv.messages) {
        speakerConv.messages = [];
      }

      speakerConv.messages.push({
        speakerId: speaker.id,
        message,
        tick: world.tick,
      });

      // Keep only recent messages
      if (speakerConv.messages.length > speakerConv.maxMessages) {
        speakerConv.messages.shift();
      }
    }

    // Mirror to listener's conversation component
    const listenerConv = listener.components.get('conversation') as any;
    if (listenerConv) {
      listenerConv.partnerId = speaker.id;
      listenerConv.isActive = true;
      listenerConv.lastMessageAt = world.tick;

      if (!listenerConv.messages) {
        listenerConv.messages = [];
      }

      listenerConv.messages.push({
        speakerId: speaker.id,
        message,
        tick: world.tick,
      });

      // Keep only recent messages
      if (listenerConv.messages.length > listenerConv.maxMessages) {
        listenerConv.messages.shift();
      }
    }

    // Emit conversation event for nearby observers
    world.eventBus.emit({
      type: 'conversation:message',
      source: 'death_bargain_system',
      data: {
        speakerId: speaker.id,
        listenerId: listener.id,
        message,
        tick: world.tick,
      },
    });
  }

  /**
   * Start a death bargain conversation
   * Ensures both entities have active conversation components
   */
  private startDeathBargainConversation(
    world: World,
    deathGod: Entity,
    hero: Entity
  ): void {
    // Ensure hero has conversation component
    if (!hero.components.get('conversation')) {
      const conv = require('../components/ConversationComponent.js').createConversationComponent(50);
      (hero as any).addComponent(conv);
    }

    // Set up conversation partnership
    const godConv = deathGod.components.get('conversation') as any;
    const heroConv = hero.components.get('conversation') as any;

    if (godConv) {
      godConv.partnerId = hero.id;
      godConv.isActive = true;
      godConv.startedAt = world.tick;
      godConv.lastMessageAt = world.tick;
    }

    if (heroConv) {
      heroConv.partnerId = deathGod.id;
      heroConv.isActive = true;
      heroConv.startedAt = world.tick;
      heroConv.lastMessageAt = world.tick;
    }
  }

  /**
   * End a death bargain conversation
   */
  private endDeathBargainConversation(deathGod: Entity, hero: Entity): void {
    const godConv = deathGod.components.get('conversation') as any;
    const heroConv = hero.components.get('conversation') as any;

    if (godConv) {
      godConv.isActive = false;
      godConv.partnerId = null;
    }

    if (heroConv) {
      heroConv.isActive = false;
      heroConv.partnerId = null;
    }
  }
}
