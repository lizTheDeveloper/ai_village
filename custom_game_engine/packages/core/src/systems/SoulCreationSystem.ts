/**
 * SoulCreationSystem - Orchestrates divine soul creation ceremonies
 *
 * When a new soul is needed (birth, reincarnation, special events),
 * this system invokes the Three Fates to create it through LLM conversation.
 *
 * Process:
 * 1. Gather context (parents, culture, cosmic conditions)
 * 2. Summon the Fates (LLM agents) to the Tapestry of Fate realm
 * 3. Conduct ceremony as multi-turn LLM conversation
 * 4. Parse results and create soul entity
 * 5. Store ceremony record for observation/replay
 *
 * Players can observe ceremonies as they happen (disembodied voices).
 */

import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl, createEntityId } from '../ecs/Entity.js';
import type {
  SoulCreationContext,
  SoulCreationResult,
  ConversationExchange,
} from '../divinity/SoulCreationCeremony.js';
import {
  generateFatePrompt,
  generateAttributeExtractionPrompt,
  parseSoulAttributesFromConversation,
  detectConflict,
  calculateDefaultAlignment,
} from '../divinity/SoulCreationCeremony.js';
import type { LLMProvider } from '@ai-village/llm';
import {
  createSoulIdentityComponent,
  getDefaultInterestsForArchetype,
  getDefaultSpeciesForCulture,
  type SoulCulture,
} from '../components/SoulIdentityComponent.js';
import { createIncarnationComponent } from '../components/IncarnationComponent.js';
import { createSoulWisdomComponent } from '../components/SoulWisdomComponent.js';
import { createSoulCreationEventComponent } from '../components/SoulCreationEventComponent.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import { createRealmLocationComponent } from '../components/RealmLocationComponent.js';
import { soulNameGenerator } from '../divinity/SoulNameGenerator.js';

/** Request to create a soul */
interface SoulCreationRequest {
  /** Context for creation */
  context: SoulCreationContext;

  /** Callback when creation completes */
  onComplete: (soulEntityId: string) => void;

  /** Observers (entity IDs that can watch) */
  observers?: string[];
}

/** Active ceremony being conducted */
interface ActiveCeremony {
  request: SoulCreationRequest;
  transcript: ConversationExchange[];
  currentSpeaker: 'weaver' | 'spinner' | 'cutter';
  turnCount: number;
  startTick: number;
  completed: boolean; // Track if ceremony has finished to prevent duplicate completions
}

/**
 * SoulCreationSystem - Creates souls through divine ceremony
 */
export class SoulCreationSystem implements System {
  readonly id: SystemId = 'soul_creation';
  readonly priority: number = 5; // Run early
  readonly requiredComponents = [] as const; // Event-driven

  private pendingRequests: SoulCreationRequest[] = [];
  private activeCeremony?: ActiveCeremony;
  private llmProvider?: LLMProvider;
  private useLLM: boolean = true;
  private turnInProgress: boolean = false;

  /**
   * Set the LLM provider for the Fates to use
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
    soulNameGenerator.setLLMProvider(provider);
  }

  /**
   * Enable or disable LLM usage (fallback to placeholders if disabled)
   */
  setUseLLM(enabled: boolean): void {
    this.useLLM = enabled;
    soulNameGenerator.setUseLLM(enabled);
  }

  /**
   * Queue a soul creation request
   */
  requestSoulCreation(
    context: SoulCreationContext,
    onComplete: (soulEntityId: string) => void,
    observers?: string[]
  ): void {
    this.pendingRequests.push({
      context,
      onComplete,
      observers,
    });
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // If ceremony in progress and not completed, continue it
    if (this.activeCeremony && !this.activeCeremony.completed) {
      // Only start a new turn if one isn't already in progress
      if (!this.turnInProgress) {
        this.turnInProgress = true;
        // Async ceremony turn - don't await, let it complete in background
        this.conductCeremonyTurn(world, this.activeCeremony)
          .then(() => {
            this.turnInProgress = false;
          })
          .catch((error) => {
            console.error('[SoulCreationSystem] Ceremony turn failed:', error);
            this.turnInProgress = false;
            // Fallback: complete ceremony with current progress
            if (this.activeCeremony && !this.activeCeremony.completed) {
              this.completeCeremony(world, this.activeCeremony);
            }
          });
      }
      return;
    }

    // Start next pending ceremony
    if (this.pendingRequests.length > 0) {
      const request = this.pendingRequests.shift();
      if (request) {
        this.startCeremony(world, request);
      }
    }
  }

  /**
   * Find a soul in the afterlife that wants to reincarnate
   */
  private findSoulForReincarnation(world: World): Entity | null {
    // Query all entities in the afterlife realm that want to reincarnate
    const afterlifeSouls = world.query()
      .with('afterlife' as any)
      .with('soul_identity' as any)
      .executeEntities();

    const eligibleSouls = afterlifeSouls.filter(soul => {
      const afterlife = soul.components.get('afterlife') as any;
      return afterlife &&
             afterlife.wantsToReincarnate &&
             !afterlife.isShade &&  // Shades have lost identity
             !afterlife.hasPassedOn; // Already moved on
    });

    if (eligibleSouls.length === 0) {
      return null;
    }

    // Pick a random eligible soul
    const randomIndex = Math.floor(Math.random() * eligibleSouls.length);
    return eligibleSouls[randomIndex] ?? null;
  }

  /**
   * Begin a soul creation ceremony
   */
  private startCeremony(world: World, request: SoulCreationRequest): void {
    // 50/50 chance to reincarnate a soul (if one exists)
    const shouldTryReincarnation = Math.random() < 0.5;

    if (shouldTryReincarnation && !request.context.isReforging) {
      const soulToReincarnate = this.findSoulForReincarnation(world);

      if (soulToReincarnate) {
        // Extract data from the soul being reincarnated
        const soulWisdom = soulToReincarnate.components.get('soul_wisdom') as any;

        // Update context to mark this as a reincarnation
        request.context.isReforging = true;
        request.context.previousWisdom = soulWisdom?.wisdomLevel ?? 0.5;
        request.context.previousLives = soulWisdom?.reincarnationCount ?? 1;

        console.log(
          `[SoulCreationSystem] 🔄 Reincarnating soul with ${request.context.previousLives} previous lives ` +
          `(wisdom: ${(request.context.previousWisdom ?? 0.5).toFixed(2)})`
        );

        // Remove soul from afterlife (it's being reborn)
        (world as any)._removeEntity?.(soulToReincarnate.id) || (world as any).deleteEntity?.(soulToReincarnate.id);
      }
    }

    this.activeCeremony = {
      request,
      transcript: [],
      currentSpeaker: 'weaver', // Weaver speaks first
      turnCount: 0,
      startTick: world.tick,
      completed: false,
    };

    // Emit event that ceremony has begun (for observers)
    world.eventBus.emit({
      type: 'soul:ceremony_started',
      source: 'soul_creation_system',
      data: {
        context: {
          parentSouls: request.context.parentSouls,
          culture: request.context.culture,
          cosmicAlignment: request.context.cosmicAlignment,
          isReforging: request.context.isReforging,
          previousWisdom: request.context.previousWisdom,
          previousLives: request.context.previousLives,
        },
        observers: request.observers,
      },
    });
  }

  /**
   * Conduct one turn of the ceremony (one Fate speaks)
   */
  private async conductCeremonyTurn(world: World, ceremony: ActiveCeremony): Promise<void> {
    // Maximum turns to prevent infinite loops
    if (ceremony.turnCount >= 10) {
      this.completeCeremony(world, ceremony);
      return;
    }

    // Emit event that this Fate is starting to think
    world.eventBus.emit({
      type: 'soul:fate_thinking',
      source: 'soul_creation_system',
      data: {
        speaker: ceremony.currentSpeaker,
      },
    });

    // Generate prompt for current speaker
    const prompt = generateFatePrompt(
      ceremony.currentSpeaker,
      ceremony.request.context,
      ceremony.transcript
    );

    // Get response from LLM or placeholder
    let response: string;
    if (this.useLLM && this.llmProvider) {
      try {
        const llmResponse = await this.llmProvider.generate({
          prompt,
          temperature: 0.8, // Creative but not random
          maxTokens: 400,   // Room for reasoning + character speech (thinking ~200 tokens, speech ~100-150 tokens)
        });
        response = llmResponse.text.trim();
        // Strip think tags to get only character speech
        response = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      } catch (error) {
        console.warn('[SoulCreationSystem] LLM failed, using placeholder:', error);
        response = this.getPlaceholderResponse(
          ceremony.currentSpeaker,
          ceremony.request.context,
          ceremony.transcript
        );
      }
    } else {
      response = this.getPlaceholderResponse(
        ceremony.currentSpeaker,
        ceremony.request.context,
        ceremony.transcript
      );
    }

    // Add to transcript
    const exchange: ConversationExchange = {
      speaker: ceremony.currentSpeaker,
      text: response,
      tick: world.tick,
      topic: this.determineTopic(ceremony.turnCount),
    };

    ceremony.transcript.push(exchange);

    // Emit event for real-time observation
    world.eventBus.emit({
      type: 'soul:fate_speaks',
      source: 'soul_creation_system',
      data: {
        speaker: ceremony.currentSpeaker,
        text: response,
        topic: exchange.topic,
      },
    });

    // Advance to next speaker
    ceremony.turnCount++;

    if (ceremony.turnCount < 3) {
      // First three turns: Weaver → Spinner → Cutter
      if (ceremony.currentSpeaker === 'weaver') {
        ceremony.currentSpeaker = 'spinner';
      } else if (ceremony.currentSpeaker === 'spinner') {
        ceremony.currentSpeaker = 'cutter';
      } else {
        // After initial pronouncements, ceremony is complete
        if (!ceremony.completed) {
          this.completeCeremony(world, ceremony);
        }
      }
    } else {
      // After turn 3, ceremony ends (prevent duplicate completions)
      if (!ceremony.completed) {
        this.completeCeremony(world, ceremony);
      }
    }
  }

  /**
   * Complete ceremony and create soul entity
   */
  private async completeCeremony(world: World, ceremony: ActiveCeremony): Promise<void> {
    // Mark as completed to prevent duplicate completions
    ceremony.completed = true;

    // Use LLM to extract attributes, fall back to keyword matching
    let parsed = parseSoulAttributesFromConversation(
      ceremony.transcript,
      ceremony.request.context
    );

    if (this.useLLM && this.llmProvider) {
      try {
        const extractionPrompt = generateAttributeExtractionPrompt(ceremony.transcript);
        const llmResponse = await this.llmProvider.generate({
          prompt: extractionPrompt,
          temperature: 0.3,
          maxTokens: 200,
        });

        const jsonMatch = llmResponse.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          if (extracted.interests && Array.isArray(extracted.interests)) {
            parsed.interests = extracted.interests;
          }
          if (extracted.archetype && typeof extracted.archetype === 'string') {
            parsed.archetype = extracted.archetype;
          }
        }
      } catch (error) {
        // LLM extraction failed - fall back to keyword-based parsing (already done above)
        console.warn(`[SoulCreationSystem] LLM attribute extraction failed, using keyword fallback:`, error);
      }
    }

    // Create soul entity
    const soulId = await this.createSoulEntity(world, ceremony, parsed);

    // Emit completion event
    world.eventBus.emit({
      type: 'soul:ceremony_complete',
      source: 'soul_creation_system',
      data: {
        soulId,
        purpose: parsed.purpose ?? 'Unknown',
        interests: parsed.interests ?? [],
        destiny: parsed.destiny,
        archetype: parsed.archetype ?? 'wanderer',
        transcript: ceremony.transcript,
      },
    });

    // Call completion callback
    ceremony.request.onComplete(soulId);

    // Clear active ceremony
    this.activeCeremony = undefined;
  }

  /**
   * Create the soul entity with all components
   */
  private async createSoulEntity(
    world: World,
    ceremony: ActiveCeremony,
    parsed: Partial<SoulCreationResult>
  ): Promise<string> {
    const { context } = ceremony.request;

    const soulEntity = new EntityImpl(createEntityId(), world.tick);

    // Generate unique soul name
    const generatedName = await soulNameGenerator.generateNewSoulName(world.tick);

    // Determine soul's original species (what body it's "born" into)
    const soulOriginSpecies = getDefaultSpeciesForCulture(generatedName.culture as SoulCulture);

    // Soul Identity Component
    const soulIdentity = createSoulIdentityComponent({
      soulName: generatedName.name,
      soulOriginCulture: generatedName.culture as SoulCulture,
      soulOriginSpecies: soulOriginSpecies,
      isReincarnated: context.isReforging ?? false,
      purpose: parsed.purpose ?? 'To find their place in the world',
      destiny: parsed.destiny,
      coreInterests: parsed.interests ?? getDefaultInterestsForArchetype(parsed.archetype ?? 'wanderer'),
      cosmicAlignment: context.cosmicAlignment,
      currentTick: world.tick,
      archetype: parsed.archetype ?? 'wanderer',
    });

    if (parsed.alignment) {
      soulIdentity.alignment = parsed.alignment;
    } else {
      soulIdentity.alignment = calculateDefaultAlignment(context.cosmicAlignment);
    }

    soulEntity.addComponent(soulIdentity);

    // Incarnation Component (not yet incarnated)
    const incarnation = createIncarnationComponent();
    soulEntity.addComponent(incarnation);

    // Soul Wisdom Component
    const wisdom = context.isReforging && context.previousWisdom && context.previousLives
      ? {
          type: 'soul_wisdom' as const,
          version: 1,
          reincarnationCount: context.previousLives,
          wisdomLevel: context.previousWisdom,
          wisdomModifier: Math.sqrt(context.previousWisdom) * 0.5,
          ascensionEligible: context.previousWisdom >= 0.85 && context.previousLives >= 10,
          firstIncarnationTick: world.tick - (context.previousLives * 100000), // Estimate
          livesLived: context.previousLives + 1,
          totalEmotionalIntensity: 0,
        }
      : createSoulWisdomComponent(world.tick);

    soulEntity.addComponent(wisdom);

    // Episodic Memory (soul's own memories, initially empty)
    soulEntity.addComponent(new EpisodicMemoryComponent({ maxMemories: 1000 }));

    // Soul Creation Event (ceremony record)
    const creationEvent = createSoulCreationEventComponent({
      parentSouls: context.parentSouls,
      culturalContext: context.culture,
      cosmicAlignment: context.cosmicAlignment,
      creationRealm: context.ceremonyRealm ?? 'tapestry_of_fate',
      currentTick: world.tick,
      isObservable: true,
    });

    // Populate with ceremony details
    for (const exchange of ceremony.transcript) {
      creationEvent.creationDebate.statements.push({
        fate: exchange.speaker as any,
        statement: exchange.text,
        aspect: this.mapTopicToAspect(exchange.topic),
        tick: exchange.tick,
      });
    }

    creationEvent.wovenPurpose = parsed.purpose ?? 'Unknown';
    creationEvent.spunInterests = parsed.interests ?? [];
    creationEvent.cutDestiny = parsed.destiny;
    creationEvent.assignedArchetype = parsed.archetype ?? 'wanderer';
    creationEvent.creationDebate.unanimous = !detectConflict(ceremony.transcript);

    soulEntity.addComponent(creationEvent);

    // Realm Location (soul starts in divine realm)
    const realmLocation = createRealmLocationComponent(context.ceremonyRealm ?? 'tapestry_of_fate');
    soulEntity.addComponent(realmLocation);

    // Add to world
    (world as any)._addEntity?.(soulEntity) || (world as any).addEntity?.(soulEntity);

    return soulEntity.id;
  }

  /**
   * Determine topic based on turn number
   */
  private determineTopic(turnCount: number): ConversationExchange['topic'] {
    if (turnCount === 0) return 'purpose';
    if (turnCount === 1) return 'interests';
    if (turnCount === 2) return 'destiny';
    return 'finalization';
  }

  /**
   * Map conversation topic to creation aspect
   */
  private mapTopicToAspect(topic: ConversationExchange['topic']): 'purpose' | 'interest' | 'destiny' | 'alignment' | 'archetype' | 'blessing' | 'curse' {
    switch (topic) {
      case 'purpose':
        return 'purpose';
      case 'interests':
        return 'interest';
      case 'destiny':
        return 'destiny';
      case 'blessing':
        return 'blessing';
      case 'curse':
        return 'curse';
      default:
        return 'archetype';
    }
  }

  /**
   * Placeholder responses (will be replaced with LLM calls)
   */
  private getPlaceholderResponse(
    speaker: 'weaver' | 'spinner' | 'cutter',
    context: SoulCreationContext,
    _transcript: ConversationExchange[]
  ): string {
    if (speaker === 'weaver') {
      if (context.isReforging) {
        return `I see a soul that has walked ${context.previousLives} paths. This time, let them seek to unite what was once divided.`;
      } else if (context.culture) {
        return `This soul shall serve as a bridge between the old ways of ${context.culture} and the wisdom yet to come.`;
      } else {
        return 'This thread I weave with purpose: to discover what lies hidden and bring it to light.';
      }
    } else if (speaker === 'spinner') {
      return 'Into this soul I spin curiosity for knowledge, love of craft, and a gentle heart that feels deeply.';
    } else {
      return 'The thread may end as a teacher whose wisdom shapes many... or as a seeker who vanishes seeking the unknowable.';
    }
  }

  /**
   * Get count of pending ceremonies
   */
  getPendingCeremoniesCount(): number {
    return this.pendingRequests.length + (this.activeCeremony ? 1 : 0);
  }
}
