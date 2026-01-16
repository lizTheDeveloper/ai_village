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
import type { LLMProvider } from '../types/LLMTypes.js';
import {
  createSoulIdentityComponent,
  getDefaultInterestsForArchetype,
  getDefaultSpeciesForCulture,
  type SoulCulture,
} from '../components/SoulIdentityComponent.js';
import { createIncarnationComponent } from '../components/IncarnationComponent.js';
import { createSoulWisdomComponent, type SoulWisdomComponent } from '../components/SoulWisdomComponent.js';
import { createSoulCreationEventComponent } from '../components/SoulCreationEventComponent.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import { createRealmLocationComponent } from '../components/RealmLocationComponent.js';
import { createAfterlifeComponent, type AfterlifeComponent } from '../components/AfterlifeComponent.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';
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
  private soulRepositorySystem?: any; // SoulRepositorySystem - type unavailable to avoid circular dependency

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
   * Create ancient souls in the afterlife for testing reincarnation
   * @param world The game world
   * @param count Number of ancient souls to create (default: 3)
   */
  createAncientSouls(world: World, count: number = 3): void {
    console.log(`[SoulCreationSystem] Creating ${count} ancient souls in the afterlife for reincarnation testing...`);

    for (let i = 0; i < count; i++) {
      const ancientSoul = new EntityImpl(createEntityId(), world.tick);

      // Soul Identity with ancient origin
      const cultures: SoulCulture[] = ['human', 'elven', 'dwarven', 'orcish', 'thrakeen'];
      const randomCulture = cultures[Math.floor(Math.random() * cultures.length)] as SoulCulture;
      const ancientNames = ['Theron', 'Astrid', 'Khepri', 'Branwen', 'Amaterasu', 'Lysander', 'Saga', 'Anubis', 'Rhiannon', 'Tsukuyomi'];
      const randomName = ancientNames[Math.floor(Math.random() * ancientNames.length)] ?? 'Ancient One';

      const soulIdentity = createSoulIdentityComponent({
        soulName: randomName,
        soulOriginCulture: randomCulture,
        soulOriginSpecies: 'human',
        isReincarnated: true,
        purpose: 'To guide the next generation',
        destiny: 'To find peace after many lives',
        coreInterests: ['knowledge', 'wisdom', 'teaching'],
        cosmicAlignment: Math.random() * 2 - 1,
        currentTick: world.tick - 1000000, // Long ago
        archetype: 'seeker',
      });

      ancientSoul.addComponent(soulIdentity);

      // Soul Wisdom with multiple past lives
      const lives = 2 + Math.floor(Math.random() * 5); // 2-6 past lives
      const wisdom = 0.3 + Math.random() * 0.5; // 0.3-0.8 wisdom

      const soulWisdom: SoulWisdomComponent = {
        type: 'soul_wisdom' as const,
        version: 1,
        reincarnationCount: lives,
        wisdomLevel: wisdom,
        wisdomModifier: Math.sqrt(wisdom) * 0.5,
        ascensionEligible: wisdom >= 0.85 && lives >= 10,
        firstIncarnationTick: world.tick - 1000000,
        livesLived: lives,
        totalEmotionalIntensity: lives * 100,
      };
      ancientSoul.addComponent(soulWisdom);

      // Afterlife Component - ready to reincarnate
      const afterlife: AfterlifeComponent = {
        type: 'afterlife' as const,
        version: 1,
        // Core needs
        coherence: 0.9,
        tether: 0.3,
        peace: 0.8,
        solitude: 0.2,
        // Death context
        causeOfDeath: 'old_age' as const,
        deathTick: world.tick - 50000,
        deathLocation: { x: 0, y: 0 },
        // Unfinished business
        unfinishedGoals: [],
        unresolvedRelationships: [],
        // Family
        descendants: [],
        // State
        isShade: false,
        hasPassedOn: false,
        isRestless: false,
        isAncestorKami: false,
        wantsToReincarnate: true,
        // Tracking
        timesRemembered: lives * 10,
        lastRememberedTick: world.tick - 1000,
        visitsFromLiving: 0,
        offeringsReceived: {},
      };
      ancientSoul.addComponent(afterlife);

      // Episodic Memory
      ancientSoul.addComponent(new EpisodicMemoryComponent({ maxMemories: 1000 }));

      // Realm Location
      ancientSoul.addComponent(createRealmLocationComponent('elysium'));

      // Add to world - uses internal _addEntity as public API doesn't expose direct entity addition
      const worldImpl = world as unknown as { _addEntity(entity: Entity): void };
      worldImpl._addEntity(ancientSoul);

      console.log(`[SoulCreationSystem]   Created ancient soul: ${randomName} (${lives} lives, ${(wisdom * 100).toFixed(0)}% wisdom)`);
    }

    console.log(`[SoulCreationSystem] ✅ ${count} ancient souls ready for reincarnation!`);
  }

  /**
   * Create a soul entity from repository data (reusing existing soul)
   * Returns the entity ID of the created soul
   */
  private createSoulFromRepository(world: World, soulRecord: any): string {
    console.log(`[SoulCreationSystem] 🔄 Reusing existing soul: ${soulRecord.name} (archetype: ${soulRecord.archetype})`);

    const soulEntity = new EntityImpl(createEntityId(), world.tick);

    // Soul Identity - use the existing soul's data
    const soulIdentity = createSoulIdentityComponent({
      soulName: soulRecord.name,
      soulOriginCulture: soulRecord.culture as SoulCulture || 'human',
      soulOriginSpecies: soulRecord.species || 'human',
      isReincarnated: true, // Mark as reincarnated since it's being reused
      purpose: soulRecord.purpose,
      destiny: undefined, // Destiny can change
      coreInterests: soulRecord.interests || getDefaultInterestsForArchetype(soulRecord.archetype),
      cosmicAlignment: 0, // Reset for new incarnation
      currentTick: world.tick,
      archetype: soulRecord.archetype || 'wanderer',
    });

    soulEntity.addComponent(soulIdentity);

    // Incarnation Component (not yet incarnated)
    const incarnation = createIncarnationComponent();
    soulEntity.addComponent(incarnation);

    // Soul Wisdom Component - track that this is a reused soul
    const wisdom = createSoulWisdomComponent(world.tick);
    soulEntity.addComponent(wisdom);

    // Episodic Memory (soul's own memories, initially empty for new incarnation)
    soulEntity.addComponent(new EpisodicMemoryComponent({ maxMemories: 1000 }));

    // Soul Creation Event - reference original ceremony if available
    const creationEvent = createSoulCreationEventComponent({
      culturalContext: soulRecord.culture,
      cosmicAlignment: 0,
      creationRealm: 'tapestry_of_fate',
      currentTick: soulRecord.soulBirthTick || world.tick,
      isObservable: false, // Original ceremony already happened
    });

    creationEvent.wovenPurpose = soulRecord.purpose;
    creationEvent.spunInterests = soulRecord.interests || [];
    creationEvent.assignedArchetype = soulRecord.archetype;

    soulEntity.addComponent(creationEvent);

    // Realm Location (soul starts in divine realm)
    const realmLocation = createRealmLocationComponent('tapestry_of_fate');
    soulEntity.addComponent(realmLocation);

    // Add to world - uses internal _addEntity as public API doesn't expose direct entity addition
    const worldImpl = world as unknown as { _addEntity(entity: Entity): void };
    worldImpl._addEntity(soulEntity);

    return soulEntity.id;
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

  /**
   * Initialize - get reference to soul repository
   */
  init(world: World): void {
    // Use getSystem instead of accessing systemRegistry directly
    const worldImpl = world as unknown as { getSystem(id: string): any };
    this.soulRepositorySystem = worldImpl.getSystem('soul_repository');

    if (!this.soulRepositorySystem) {
      console.warn('[SoulCreationSystem] SoulRepositorySystem not found - soul reuse disabled');
    } else {
      console.log('[SoulCreationSystem] Connected to soul repository with', this.soulRepositorySystem.getStats().totalSouls, 'souls');
      // Connect the soul name generator to the repository for global uniqueness checking
      soulNameGenerator.setSoulRepository(this.soulRepositorySystem);
    }
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
      .with('afterlife')
      .with('soul_identity')
      .executeEntities();

    const eligibleSouls = afterlifeSouls.filter(soul => {
      const afterlife = soul.getComponent<AfterlifeComponent>('afterlife');
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
    // PRIORITY 1: Check global soul repository for existing souls to reuse
    if (this.soulRepositorySystem && !request.context.isReforging) {
      const stats = this.soulRepositorySystem.getStats();

      if (stats.totalSouls > 0) {
        // 50% chance to reuse an existing soul from the repository (50% new souls, 50% reforged)
        const shouldReuseSoul = Math.random() < 0.5;

        if (shouldReuseSoul) {
          const soulRecord = this.soulRepositorySystem.getRandomSoul();

          if (soulRecord) {
            console.log(`[SoulCreationSystem] 🌟 Reforging soul from repository: ${soulRecord.name} (new body, new destiny)`);

            // Mark this as a reforging - the Three Fates will decide the new destiny
            request.context.isReforging = true;
            request.context.previousWisdom = soulRecord.wisdom || 0;
            request.context.previousLives = soulRecord.incarnationCount || 0;
            request.context.reincarnatedSoulId = soulRecord.id;

            // Continue to ceremony - the Fates will acknowledge this is a returning soul
            // and decide the new purpose/destiny for this incarnation
          }
        }
      }
    }

    // PRIORITY 2: Check local afterlife for souls wanting to reincarnate
    const shouldTryReincarnation = Math.random() < 1.0;

    if (shouldTryReincarnation && !request.context.isReforging) {
      const soulToReincarnate = this.findSoulForReincarnation(world);

      if (soulToReincarnate) {
        // Extract data from the soul being reincarnated
        const soulWisdom = soulToReincarnate.getComponent<SoulWisdomComponent>('soul_wisdom');
        const soulIdentity = soulToReincarnate.getComponent<SoulIdentityComponent>('soul_identity');

        console.log(`[SoulCreationSystem] 🔄 REINCARNATING SOUL: ${soulIdentity?.soulName || 'Unknown'}, lives: ${soulWisdom?.reincarnationCount ?? 1}, wisdom: ${soulWisdom?.wisdomLevel ?? 0.5}`);

        // Update context to mark this as a reincarnation
        request.context.isReforging = true;
        request.context.previousWisdom = soulWisdom?.wisdomLevel ?? 0.5;
        request.context.previousLives = soulWisdom?.reincarnationCount ?? 1;
        request.context.reincarnatedSoulId = soulToReincarnate.id;

        // ✅ CONSERVATION OF GAME MATTER:
        // DO NOT delete the soul entity - it persists forever across all incarnations
        // The soul will transition from afterlife to incarnated state when the new body is created
        // Soul entity contains accumulated memories, wisdom, and relationships from all lifetimes
        console.log(`[SoulCreationSystem] Soul ${soulIdentity?.soulName || 'Unknown'} will be incarnated into new body (soul entity preserved)`);
      } else {
        console.log(`[SoulCreationSystem] No eligible souls found for reincarnation - creating new soul`);
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
    let thoughts: string | undefined;
    if (this.useLLM && this.llmProvider) {
      try {
        const llmResponse = await this.llmProvider.generate({
          prompt,
          temperature: 0.8, // Creative but not random
          maxTokens: 400,   // Room for reasoning + character speech (thinking ~200 tokens, speech ~100-150 tokens)
        });
        let fullResponse = llmResponse.text.trim();

        // Extract thinking content - match BOTH complete and incomplete blocks
        // Complete: <think>...</think> or <thinking>...</thinking>
        // Incomplete: <think>... or <thinking>... (LLM didn't close the tag)
        const completeThinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)<\/thinking>/i);
        const completeThinkMatch = fullResponse.match(/<think>([\s\S]*?)<\/think>/i);
        const incompleteThinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)$/i);
        const incompleteThinkMatch = fullResponse.match(/<think>([\s\S]*?)$/i);

        thoughts = completeThinkingMatch?.[1]?.trim()
          || completeThinkMatch?.[1]?.trim()
          || incompleteThinkingMatch?.[1]?.trim()
          || incompleteThinkMatch?.[1]?.trim();

        // Strip ALL thinking content (both complete and incomplete blocks)
        response = fullResponse
          .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '') // Complete blocks
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/<thinking>[\s\S]*$/gi, '')              // Incomplete blocks (to end of string)
          .replace(/<think>[\s\S]*$/gi, '')
          .trim();

        // If response is empty after stripping, the LLM only returned thinking - use placeholder
        if (!response || response.length === 0) {
          console.warn('[SoulCreationSystem] LLM returned only thinking content with no character speech, using placeholder');
          response = this.getPlaceholderResponse(
            ceremony.currentSpeaker,
            ceremony.request.context,
            ceremony.transcript
          );
          // Store the malformed response as "thoughts" for debugging
          if (!thoughts) {
            thoughts = fullResponse;
          }
        }

        // Also handle JSON responses
        const jsonMatch = response.match(/\{[\s\S]*"speaking":\s*"([^"]+)"[\s\S]*\}/);
        if (jsonMatch && jsonMatch[1]) {
          // Extract thinking from JSON if present
          const jsonThinkingMatch = fullResponse.match(/"thinking":\s*"([^"]+)"/);
          if (jsonThinkingMatch?.[1] && !thoughts) {
            thoughts = jsonThinkingMatch[1];
          }
          response = jsonMatch[1];
        }
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
      thoughts: thoughts, // Preserve thinking content for debugging/transparency
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

    // ✅ Validate: Ensure at least 2 interests (souls need variety!)
    if (!parsed.interests || parsed.interests.length < 2) {
      console.warn(`[SoulCreationSystem] Soul has only ${parsed.interests?.length || 0} interests, adding complementary interests`);
      const baseInterests = parsed.interests || [];
      const archetype = parsed.archetype || 'wanderer';

      // Add complementary interests based on archetype
      const complementary = this.getComplementaryInterests(archetype, baseInterests);
      parsed.interests = [...baseInterests, ...complementary].slice(0, 3); // Max 3

      console.log(`[SoulCreationSystem] Updated interests to: ${parsed.interests.join(', ')}`);
    }

    // Create soul entity
    const soulId = await this.createSoulEntity(world, ceremony, parsed);

    // Get the soul entity to extract name and species for repository
    const soulEntity = world.getEntity(soulId);
    const soulIdentity = soulEntity?.getComponent<SoulIdentityComponent>('soul_identity');

    // Compile all Fate thoughts into a single string for the soul record
    const allThoughts = ceremony.transcript
      .filter(exchange => exchange.thoughts)
      .map(exchange => {
        const speaker = exchange.speaker === 'weaver' ? 'The Weaver'
          : exchange.speaker === 'spinner' ? 'The Spinner'
          : exchange.speaker === 'cutter' ? 'The Cutter'
          : exchange.speaker;
        return `[${speaker}] ${exchange.thoughts}`;
      })
      .join('\n\n');

    // Emit completion event with all fields needed by repository
    world.eventBus.emit({
      type: 'soul:ceremony_complete',
      source: 'soul_creation_system',
      data: {
        soulId, // Soul entity ID (not agent ID - this is a soul, not an agent yet)
        agentId: soulId, // For backward compatibility, though souls don't have agent IDs yet
        name: soulIdentity?.soulName || 'Unknown',
        species: soulIdentity?.soulOriginSpecies || 'human',
        purpose: parsed.purpose ?? 'Unknown',
        interests: parsed.interests ?? [],
        destiny: parsed.destiny,
        archetype: parsed.archetype ?? 'wanderer',
        transcript: ceremony.transcript,
        thoughts: allThoughts || undefined, // Compiled Fate reasoning
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

    // ✅ CONSERVATION OF GAME MATTER: Reuse existing soul entity if reincarnating
    let soulEntity: EntityImpl;
    if (context.reincarnatedSoulId) {
      // Get existing soul entity from repository/afterlife
      const existingSoul = world.getEntity(context.reincarnatedSoulId);
      if (!existingSoul) {
        console.error(`[SoulCreationSystem] Reincarnated soul ${context.reincarnatedSoulId} not found! Creating new soul.`);
        soulEntity = new EntityImpl(createEntityId(), world.tick);
      } else {
        console.log(`[SoulCreationSystem] Updating existing soul entity ${context.reincarnatedSoulId} with new destiny`);
        soulEntity = existingSoul as EntityImpl;
      }
    } else {
      // Create brand new soul
      soulEntity = new EntityImpl(createEntityId(), world.tick);
    }

    // Generate or preserve soul name
    let soulName: string;
    let soulCulture: SoulCulture;
    let soulOriginSpecies: string;

    if (context.reincarnatedSoulId && soulEntity.hasComponent('soul_identity')) {
      // Reincarnating - preserve original name and culture
      const existingIdentity = soulEntity.getComponent<SoulIdentityComponent>('soul_identity');
      if (existingIdentity) {
        soulName = existingIdentity.soulName;
        soulCulture = existingIdentity.soulOriginCulture;
        soulOriginSpecies = existingIdentity.soulOriginSpecies;
        console.log(`[SoulCreationSystem] Preserving soul name: ${soulName} (${soulCulture})`);
      } else {
        // Fallback if component not found (shouldn't happen)
        const generatedName = await soulNameGenerator.generateNewSoulName(world.tick);
        soulName = generatedName.name;
        soulCulture = generatedName.culture as SoulCulture;
        soulOriginSpecies = getDefaultSpeciesForCulture(soulCulture);
      }
    } else {
      // New soul - generate unique name
      const generatedName = await soulNameGenerator.generateNewSoulName(world.tick);
      soulName = generatedName.name;
      soulCulture = generatedName.culture as SoulCulture;
      soulOriginSpecies = getDefaultSpeciesForCulture(soulCulture);
    }

    // Soul Identity Component - update with new ceremony results
    const soulIdentity = createSoulIdentityComponent({
      soulName,
      soulOriginCulture: soulCulture,
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

    // Update or add soul identity component
    if (soulEntity.hasComponent('soul_identity')) {
      soulEntity.removeComponent('soul_identity');
    }
    soulEntity.addComponent(soulIdentity);

    // Incarnation Component - preserve existing or create new
    if (!soulEntity.hasComponent('incarnation')) {
      const incarnation = createIncarnationComponent();
      soulEntity.addComponent(incarnation);
    }
    // Existing incarnation component is preserved with full history

    // Soul Wisdom Component - preserve existing or create new
    if (!soulEntity.hasComponent('soul_wisdom')) {
      const wisdom = context.isReforging && context.previousWisdom && context.previousLives
        ? {
            type: 'soul_wisdom' as const,
            version: 1,
            reincarnationCount: context.previousLives + 1, // Increment for this new reincarnation
            wisdomLevel: context.previousWisdom,
            wisdomModifier: Math.sqrt(context.previousWisdom) * 0.5,
            ascensionEligible: context.previousWisdom >= 0.85 && context.previousLives >= 10,
            firstIncarnationTick: world.tick - (context.previousLives * 100000), // Estimate
            livesLived: context.previousLives + 1,
            totalEmotionalIntensity: 0,
          }
        : createSoulWisdomComponent(world.tick);
      soulEntity.addComponent(wisdom);
    }
    // Existing wisdom is preserved with accumulated knowledge

    // Episodic Memory - preserve existing memories from ALL past lives
    if (!soulEntity.hasComponent('episodic_memory')) {
      soulEntity.addComponent(new EpisodicMemoryComponent({ maxMemories: 1000 }));
    }
    // Existing episodic memory is preserved with all past-life memories

    // Soul Creation Event (ceremony record)
    const creationEvent = createSoulCreationEventComponent({
      parentSouls: context.parentSouls,
      culturalContext: context.culture,
      cosmicAlignment: context.cosmicAlignment,
      creationRealm: context.ceremonyRealm ?? 'tapestry_of_fate',
      currentTick: world.tick,
      isObservable: true,
    });

    // Populate with ceremony details - only include Fates' statements
    for (const exchange of ceremony.transcript) {
      // Filter out non-Fate speakers (soul, chorus)
      if (exchange.speaker === 'weaver' || exchange.speaker === 'spinner' || exchange.speaker === 'cutter') {
        creationEvent.creationDebate.statements.push({
          fate: exchange.speaker,
          statement: exchange.text,
          aspect: this.mapTopicToAspect(exchange.topic),
          tick: exchange.tick,
        });
      }
    }

    creationEvent.wovenPurpose = parsed.purpose ?? 'Unknown';
    creationEvent.spunInterests = parsed.interests ?? [];
    creationEvent.cutDestiny = parsed.destiny;
    creationEvent.assignedArchetype = parsed.archetype ?? 'wanderer';
    creationEvent.creationDebate.unanimous = !detectConflict(ceremony.transcript);

    // Only add creation event for new souls (reincarnated souls keep their original creation event)
    if (!context.reincarnatedSoulId) {
      soulEntity.addComponent(creationEvent);
    } else {
      console.log(`[SoulCreationSystem] Soul ${soulName} is being reforged - preserving original creation event`);
    }

    // Realm Location - update or add
    const realmLocation = createRealmLocationComponent(context.ceremonyRealm ?? 'tapestry_of_fate');
    if (soulEntity.hasComponent('realm_location')) {
      soulEntity.removeComponent('realm_location');
    }
    soulEntity.addComponent(realmLocation);

    // Add to world ONLY if this is a new soul (reincarnated souls are already in the world)
    if (!context.reincarnatedSoulId) {
      // Uses internal _addEntity as public API doesn't expose direct entity addition
      const worldImpl = world as unknown as { _addEntity(entity: Entity): void };
      worldImpl._addEntity(soulEntity);
      console.log(`[SoulCreationSystem] Added new soul ${soulName} to world`);
    } else {
      console.log(`[SoulCreationSystem] Updated existing soul ${soulName} with new destiny from ceremony`);
    }

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
   * Get complementary interests based on archetype
   * Ensures souls have at least 2-3 diverse interests
   */
  private getComplementaryInterests(archetype: string, existingInterests: string[]): string[] {
    const allInterests = [
      'knowledge', 'crafting', 'nature', 'social', 'combat',
      'magic', 'art', 'exploration', 'farming', 'leadership',
      'trade', 'healing', 'building'
    ];

    // Archetype-specific interest suggestions
    const archetypeInterests: Record<string, string[]> = {
      wanderer: ['exploration', 'nature', 'social'],
      protector: ['combat', 'leadership', 'healing'],
      creator: ['crafting', 'building', 'art'],
      seeker: ['knowledge', 'exploration', 'magic'],
      unifier: ['social', 'leadership', 'trade'],
      mystic: ['magic', 'knowledge', 'healing'],
      farmer: ['farming', 'nature', 'crafting'],
      merchant: ['trade', 'social', 'leadership'],
      healer: ['healing', 'knowledge', 'nature'],
      builder: ['building', 'crafting', 'leadership'],
      leader: ['leadership', 'social', 'combat'],
    };

    const suggested = archetypeInterests[archetype] || archetypeInterests['wanderer'] || ['exploration', 'social'];
    const available = suggested.filter(i => !existingInterests.includes(i));

    // Need at least 2 total interests
    const needed = Math.max(0, 2 - existingInterests.length);
    const complementary = available.slice(0, needed);

    // If still not enough, add random interests
    if (complementary.length < needed) {
      const remaining = allInterests.filter(i =>
        !existingInterests.includes(i) && !complementary.includes(i)
      );
      while (complementary.length < needed && remaining.length > 0) {
        const random = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
        if (random) complementary.push(random);
      }
    }

    return complementary;
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
