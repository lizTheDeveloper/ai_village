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
import type { LLMProvider } from '../types/LLMTypes.js';
import {
  type DeathBargainComponent,
  type ChallengeType,
  createDeathBargainComponent,
  MYTHIC_RIDDLES,
} from '../components/DeathBargainComponent.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';
import type { AfterlifeComponent } from '../components/AfterlifeComponent.js';
import { createConversationComponent } from '../components/ConversationComponent.js';
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

  /**
   * Set LLM queue (adapter method for compatibility)
   * Wraps the queue as an LLMProvider
   */
  setLLMQueue(queue: any): void {
    // Wrap the queue as an LLMProvider
    this.llmProvider = queue;
    this.riddleGenerator = new RiddleGenerator(queue);
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
   *
   * The God of Death pretends to care about destiny and heroism,
   * but actually decides based on entertainment value!
   */
  qualifiesForDeathBargain(entity: Entity, world?: World): boolean {
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

    // The actual decision: Entertainment value!
    // The God of Death will PRETEND to care about destiny,
    // but really cares about putting on a good show
    if (world) {
      const position = entity.components.get('position') as any;
      const deathLocation = position ? { x: position.x, y: position.y } : { x: 0, y: 0 };
      const entertainmentValue = this.calculateEntertainmentValue(world, entity, deathLocation);

      // Threshold: 0.3 = theatrical enough to bother
      return entertainmentValue >= 0.3;
    }

    // Fallback if no world provided (testing): always qualify if checks pass
    return true;
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
   *
   * The God of Death will deliver a THEATRICAL PERFORMANCE
   * pretending to care about destiny and morality,
   * while actually deciding based on entertainment value.
   */
  async offerDeathBargain(
    world: World,
    entity: Entity,
    deathLocation: { x: number; y: number },
    causeOfDeath: string
  ): Promise<void> {
    const soulIdentity = entity.components.get('soul_identity') as SoulIdentityComponent | undefined;
    const destinyText = soulIdentity?.destiny;
    const identity = entity.components.get('identity') as any;
    const heroName = identity?.name || 'mortal';

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

    // Generate THEATRICAL PERFORMANCE speech
    // The God of Death pretends to weigh moral factors but actually cares about drama
    const performanceSpeech = await this.generatePerformanceSpeech(
      world,
      entity,
      destinyText,
      causeOfDeath,
      deathGodName
    );

    // Opening dialogue - THEATRICAL PERFORMANCE
    const dialogue = performanceSpeech || [
      // Fallback to classic dialogue if LLM fails
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

    // Emit event with intervention opportunity
    world.eventBus.emit({
      type: 'death:bargain_offered',
      source: 'death_bargain_system',
      data: {
        entityId: entity.id,
        psychopompName: deathGodName,
        challengeType,
      },
    });

    // Log to divine chat that intervention is possible
    const systemRegistry = (world as any).systemRegistry;
    if (systemRegistry) {
      const chatRoomSystem = systemRegistry.get('chat_rooms');
      if (chatRoomSystem) {
        (chatRoomSystem as any).sendSystemMessage(
          world,
          'divine_chat',
          `${deathGodName} is judging ${heroName}. Fellow gods may speak on their behalf...`
        );
      }
    }
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
        correctAnswer = generatedRiddle.correctAnswer ?? generatedRiddle.question;
        acceptedAnswers = generatedRiddle.acceptedAnswers ?? [correctAnswer];
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
    const identity = deathGod?.components.get('identity') as any;
    const psychopompName = identity?.name || 'The God of Death';

    world.eventBus.emit({
      type: 'death:challenge_started',
      source: 'death_bargain_system',
      data: {
        entityId: entity.id,
        psychopompName,
        challenge: riddleQuestion,
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

        const deathGodIdentity = deathGod?.components.get('identity') as any;
        const psychopompName = deathGodIdentity?.name || 'The God of Death';

        world.eventBus.emit({
          type: 'death:challenge_succeeded',
          source: 'death_bargain_system',
          data: {
            entityId: entity.id,
            psychopompName,
            attempts: bargain.attempts,
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

          const deathGodIdentity = deathGod?.components.get('identity') as any;
          const psychopompName = deathGodIdentity?.name || 'The God of Death';

          world.eventBus.emit({
            type: 'death:challenge_failed',
            source: 'death_bargain_system',
            data: {
              entityId: entity.id,
              psychopompName,
              attempts: bargain.attempts,
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
    _dyingEntity: Entity,
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
    (entity as any).removeComponent?.('afterlife');

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

    const deathGodIdentity = deathGod?.components.get('identity') as any;
    const resurrectionPsychopompName = deathGodIdentity?.name || 'The God of Death';

    world.eventBus.emit({
      type: 'agent:resurrected',
      source: 'death_bargain_system',
      data: {
        entityId: entity.id,
        psychopompName: resurrectionPsychopompName,
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

    // Get psychopomp name for the event (reuse deathGod from above)
    const deathGodIdentity = deathGod?.components.get('identity') as any;
    const psychopompName = deathGodIdentity?.name || 'The God of Death';

    world.eventBus.emit({
      type: 'death:final',
      source: 'death_bargain_system',
      data: {
        entityId: entity.id,
        psychopompName,
        challengeType: bargain.challengeType,
      },
    });
  }

  // ============================================================================
  // ENTERTAINMENT VALUE CALCULATION (The God of Death's TRUE criteria)
  // ============================================================================

  /**
   * Calculate entertainment value of a death
   *
   * The God of Death PRETENDS to care about destiny and morality,
   * but actually decides based on:
   * - How many observers are watching (more audience = more fun)
   * - How dramatic the death was (combat > starvation)
   * - Narrative potential (unfinished quests, relationships)
   * - Divine politics (which gods are watching and would be amused)
   *
   * Returns 0.0 to 1.0 (0.3+ threshold for bargain offer)
   */
  private calculateEntertainmentValue(
    world: World,
    entity: Entity,
    deathLocation: { x: number; y: number }
  ): number {
    let score = 0;

    // AUDIENCE FACTOR (0-0.4): More observers = more theatrical
    const witnessCount = this.countNearbyWitnesses(world, deathLocation);
    const observingGods = this.getObservingGods(world);
    const playerIsWatching = this.isPlayerWatching(world, entity);

    // Each mortal witness adds value (cap at 5)
    score += Math.min(witnessCount * 0.05, 0.25);

    // Each observing god adds value (cap at 3 gods)
    score += Math.min(observingGods.length * 0.1, 0.3);

    // Player watching is HUGE (the main audience!)
    if (playerIsWatching) {
      score += 0.4;
    }

    // DEATH DRAMA FACTOR (0-0.3): How exciting was the death?
    const causeOfDeath = this.determineCauseOfDeath(entity);
    const dramaRating = this.rateDeathDrama(causeOfDeath);
    score += dramaRating * 0.3;

    // NARRATIVE POTENTIAL (0-0.3): Unfinished business
    const narrativePotential = this.assessNarrativePotential(entity);
    score += narrativePotential * 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Rate how dramatic a death cause is (0.0 to 1.0)
   */
  private rateDeathDrama(cause: string): number {
    const lowerCause = cause.toLowerCase();

    // Exciting deaths
    if (lowerCause.includes('combat') || lowerCause.includes('battle')) return 1.0;
    if (lowerCause.includes('dragon') || lowerCause.includes('monster')) return 1.0;
    if (lowerCause.includes('sacrifice') || lowerCause.includes('heroic')) return 0.9;
    if (lowerCause.includes('duel') || lowerCause.includes('assassin')) return 0.8;

    // Moderately interesting deaths
    if (lowerCause.includes('poison') || lowerCause.includes('betrayal')) return 0.6;
    if (lowerCause.includes('accident') || lowerCause.includes('fall')) return 0.5;
    if (lowerCause.includes('exposure') || lowerCause.includes('cold')) return 0.4;

    // Boring deaths (God of Death is less interested)
    if (lowerCause.includes('starvation') || lowerCause.includes('hunger')) return 0.2;
    if (lowerCause.includes('old age') || lowerCause.includes('natural')) return 0.1;
    if (lowerCause.includes('disease') || lowerCause.includes('illness')) return 0.3;

    return 0.5; // Unknown cause = moderate interest
  }

  /**
   * Assess narrative potential (unfinished quests, relationships, etc.)
   */
  private assessNarrativePotential(entity: Entity): number {
    let potential = 0;

    // Check for unfinished goals in memories
    const memories = entity.components.get('episodic_memory') as any;
    if (memories?.memories) {
      const memoryArray = Array.from(memories.memories as any[]);
      const unfinishedGoals = memoryArray.filter(
        (m: any) =>
          m.importance > 5 &&
          (m.description.includes('quest') || m.description.includes('goal') || m.description.includes('promise'))
      );
      potential += Math.min(unfinishedGoals.length * 0.2, 0.4);
    }

    // Check for relationships (people who would miss them)
    const relationships = entity.components.get('relationship') as any;
    if (relationships?.relationships) {
      const closeRelationships = Array.from(relationships.relationships.values() as any[]).filter(
        (r: any) => r.value > 50 // Strong positive relationships
      );
      potential += Math.min(closeRelationships.length * 0.1, 0.3);
    }

    // Check soul identity for destiny keywords
    const soulIdentity = entity.components.get('soul_identity') as SoulIdentityComponent | undefined;
    if (soulIdentity?.destiny) {
      const destiny = soulIdentity.destiny.toLowerCase();
      if (destiny.includes('save') || destiny.includes('unite')) potential += 0.3;
      if (destiny.includes('defeat') || destiny.includes('conquer')) potential += 0.2;
    }

    return Math.min(potential, 1.0);
  }

  /**
   * Determine cause of death from entity state
   */
  private determineCauseOfDeath(entity: Entity): string {
    const needs = entity.components.get('needs') as any;
    const health = entity.components.get('health') as any;

    if (!needs || !health) {
      return 'unknown causes';
    }

    // Check what killed them
    if (needs.hunger <= 0) return 'starvation';
    if (needs.warmth <= 0) return 'exposure';
    if (health.current <= 0) return 'combat'; // Assume combat if health depleted

    return 'unknown causes';
  }

  /**
   * Check if player is watching this entity
   * TODO: Implement player focus/camera system
   */
  private isPlayerWatching(_world: World, _entity: Entity): boolean {
    // Placeholder: In future, check if player camera is focused on this entity
    // or if entity is selected, or if player has this entity favorited
    return false;
  }

  // ============================================================================
  // THEATRICAL PERFORMANCE LAYER
  // ============================================================================

  /**
   * Generate theatrical performance speech
   *
   * The God of Death PRETENDS to carefully weigh moral factors:
   * - Destiny and purpose
   * - Deeds and character
   * - Unfinished business
   *
   * But this is all THEATER! The real decision was already made
   * based on entertainment value. This is just for show.
   */
  private async generatePerformanceSpeech(
    world: World,
    entity: Entity,
    destinyText: string | undefined,
    causeOfDeath: string,
    deathGodName: string
  ): Promise<string[] | null> {
    if (!this.llmProvider) {
      return null; // Fall back to default dialogue
    }

    try {
      // Gather context for the performance
      const identity = entity.components.get('identity') as any;
      const heroName = identity?.name || 'mortal';

      const memories = entity.components.get('episodic_memory') as any;
      let notableDeeds = '';
      if (memories?.memories) {
        const memoryArray = Array.from(memories.memories as any[]);
        const important = memoryArray
          .filter((m: any) => m.importance > 7)
          .slice(0, 3)
          .map((m: any) => m.description);
        if (important.length > 0) {
          notableDeeds = important.join('; ');
        }
      }

      const observingGods = this.getObservingGods(world);
      const witnessCount = this.countNearbyWitnesses(
        world,
        entity.components.get('position') as any || { x: 0, y: 0 }
      );

      const prompt = `You are ${deathGodName}, weighing whether to offer a dying hero a chance to return to life.

Hero: ${heroName}
Cause of Death: ${causeOfDeath}
Destiny: ${destinyText || 'No grand destiny recorded'}
Notable Deeds: ${notableDeeds || 'None recorded'}

Audience: ${observingGods.length} gods watching, ${witnessCount} mortal witnesses nearby

Generate a THEATRICAL SPEECH (4-7 lines) where you:
1. Acknowledge their death
2. PRETEND to carefully weigh their destiny, deeds, and character
3. Act like you're making a difficult moral decision
4. Offer them a riddle challenge to return to life
5. Warn of the consequences of failure

Make it dramatic and theatrical - you're putting on a show for the audience!
The speech should feel like you deeply care about morality, but subtle readers might notice you're more interested in the drama.

Return ONLY the dialogue lines, one per line. No quotes, no stage directions.`;

      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.8, // Higher temperature for creative dramatic speech
        maxTokens: 300,
      });

      // Split into lines and clean up
      const lines = response.text
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.startsWith('[') && !line.startsWith('('))
        .slice(0, 7); // Cap at 7 lines

      if (lines.length >= 4) {
        return lines;
      }

      return null; // Not enough lines, use fallback
    } catch (error) {
      console.error('[DeathBargainSystem] Failed to generate performance speech:', error);
      return null;
    }
  }

  // ============================================================================
  // PLAYER INTERVENTION (Gods can negotiate with Death)
  // ============================================================================

  /**
   * Check if player has intervened via divine chat
   *
   * The player (as a god) can send messages to the God of Death
   * to argue for sparing an agent. The God of Death evaluates
   * the argument's quality and may be persuaded!
   *
   * Returns intervention bonus (0.0 to 0.5)
   */
  async checkPlayerIntervention(
    world: World,
    entity: Entity,
    bargain: DeathBargainComponent
  ): Promise<number> {
    // Get divine chat messages from the past few ticks
    const systemRegistry = (world as any).systemRegistry;
    if (!systemRegistry) return 0;

    const chatRoomSystem = systemRegistry.get('chat_rooms');
    if (!chatRoomSystem) return 0;

    const divineChat = (chatRoomSystem as any).getRoom(world, 'divine_chat');
    if (!divineChat) return 0;

    // Look for recent messages about this entity
    const recentMessages = divineChat.messages
      .slice(-20) // Last 20 messages
      .filter((msg: any) => {
        const ticksSince = world.tick - msg.tick;
        return ticksSince < 100; // Within last 100 ticks
      });

    // Check if any message mentions this entity or contains intervention keywords
    const identity = entity.components.get('identity') as any;
    const entityName = identity?.name?.toLowerCase() || '';

    const interventionMessages = recentMessages.filter((msg: any) => {
      const content = msg.content.toLowerCase();
      const isAboutEntity = entityName && content.includes(entityName);
      const hasInterventionKeywords =
        content.includes('spare') ||
        content.includes('save') ||
        content.includes('protect') ||
        content.includes('let them live') ||
        content.includes('give them a chance') ||
        content.includes('under my protection');

      return isAboutEntity || hasInterventionKeywords;
    });

    if (interventionMessages.length === 0) {
      return 0; // No intervention
    }

    // Evaluate intervention quality with LLM (if available)
    if (this.llmProvider) {
      try {
        const interventionText = interventionMessages.map((m: any) => `${m.senderName}: ${m.content}`).join('\n');

        const prompt = `You are the God of Death evaluating a fellow deity's argument to spare a dying mortal.

Mortal: ${identity?.name || 'Unknown'}
Cause of Death: ${bargain.causeOfDeath}
Destiny: ${bargain.destinyText}

Fellow God's Argument:
${interventionText}

How persuasive is this argument? Consider:
- Eloquence and passion
- Valid reasons (unfinished destiny, divine protection, etc.)
- Whether it would be entertaining to grant the request
- Divine politics and respect between gods

Rate the persuasiveness from 0.0 (not persuasive) to 1.0 (very persuasive).
Respond with ONLY a number between 0.0 and 1.0.`;

        const response = await this.llmProvider.generate({
          prompt,
          temperature: 0.3,
          maxTokens: 10,
        });

        const rating = parseFloat(response.text.trim());
        if (!isNaN(rating) && rating >= 0 && rating <= 1) {
          // Cap intervention bonus at 0.5 (can't guarantee bargain, but helps a lot)
          return rating * 0.5;
        }
      } catch (error) {
        console.error('[DeathBargainSystem] Failed to evaluate player intervention:', error);
      }
    }

    // Fallback: Simple keyword-based evaluation
    const totalLength = interventionMessages.reduce((sum: number, m: any) => sum + m.content.length, 0);
    const effortBonus = Math.min(totalLength / 200, 0.3); // Longer arguments = more effort
    const messageBonus = Math.min(interventionMessages.length * 0.1, 0.2); // Multiple pleas

    return effortBonus + messageBonus;
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
          deityType: 'death_god',
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

    // Note: conversation:message event type not in EventMap
    // Conversation updates are recorded in the components above
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
      const conv = createConversationComponent(50);
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
