/**
 * FatesCouncilSystem - The Three Fates meet in the evening to weave exotic/epic narratives
 *
 * The Fates are narratively omniscient but meta-blind:
 * - They see ALL entities equally (souls, gods, player-entity, deities, spirits)
 * - They have NO knowledge of who is a "player"
 * - They only see stories, patterns, narrative potential
 * - They can assign plots to ANYONE, including the player-god
 *
 * Council Frequency: Once per evening (daily)
 * Scope: ONLY exotic and epic plots (not micro/small/medium)
 *
 * The Fates use LLM-powered conversation to:
 * 1. Examine the narrative tapestry
 * 2. Identify threads that need exotic/epic plots
 * 3. Weave stories together (connect plots)
 * 4. Create poetic justice and compelling arcs
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { LLMDecisionQueue } from '../decision/LLMDecisionProcessor.js';
import type { PlotLineInstance, PlotLinesComponent } from './PlotTypes.js';
import { addActivePlot } from './PlotTypes.js';
import { plotLineRegistry, instantiatePlot } from './PlotLineRegistry.js';
import type { SoulIdentityComponent } from '../soul/SoulIdentityComponent.js';
import type { SilverThreadComponent } from '../soul/SilverThreadComponent.js';
import type { DeityComponent } from '../components/DeityComponent.js';
import type { ConversationExchange } from '../divinity/SoulCreationCeremony.js';
import { FATE_PERSONAS } from '../divinity/SoulCreationCeremony.js';
import { EpisodicMemoryComponent, type EpisodicMemory } from '../components/EpisodicMemoryComponent.js';

/** Ticks per game day (20 TPS * 60 sec * 60 min * 24 hr = 1,728,000 ticks) */
const TICKS_PER_DAY = 20 * 60 * 60 * 24;

/** Time phase of day */
type TimePhase = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Entity thread in the narrative tapestry
 * The Fates see ALL entities equally - souls, gods, player, deities
 */
export interface EntityThread {
  entityId: string;
  entityType: 'soul' | 'deity' | 'god' | 'angel' | 'demon' | 'spirit' | 'unknown';
  name: string;

  // Narrative state
  activePlots: string[];  // Plot instance IDs currently active
  completedPlots: number;  // Count of completed plots (for history depth)
  wisdom: number;  // Wisdom/power level

  // Recent activity (narrative hooks)
  recentActions: string[];  // "angered deity Theros", "started invasion", "answered 10 prayers"

  // Story quality assessment
  storyPotential: number;  // 0-1, how interesting is their current situation?
  needsChallenge: boolean;  // Been too peaceful?
  overwhelmed: boolean;  // Too many plots already?

  // Brief context for Fates
  context: string;  // "Village leader with 3 children, recently lost spouse to plague"
}

/**
 * Recent exotic event that could trigger a plot
 */
export interface ExoticEvent {
  type: string;  // Event type
  entityId: string;  // Who was involved
  description: string;  // Human-readable for Fates
  tick: number;
  severity: number;  // 0-1, how significant
}

/**
 * Story hook - potential plot assignment
 */
export interface StoryHook {
  event: ExoticEvent;
  affectedEntity: string;
  candidatePlots: string[];  // Which exotic plots could fit
  narrativeQuality: number;  // 0-1, estimated story quality
  poeticJustice?: string;  // Why this would be poetically fitting
}

/**
 * Context for Fates council meeting
 */
export interface FatesCouncilContext {
  // All entities in the tapestry
  allThreads: EntityThread[];

  // Recent exotic events (could trigger plots)
  recentExoticEvents: ExoticEvent[];

  // Current narrative state
  activeExoticPlots: number;
  activeEpicPlots: number;

  // Story opportunities
  potentialHooks: StoryHook[];

  // World state
  worldTension: number;  // 0-1, peaceful vs chaotic
  dayNumber: number;
  daysSinceLastCouncil: number;
}

/**
 * Fates decision from council
 */
export interface FatesDecision {
  // Plot assignments
  plotAssignments: Array<{
    entityId: string;
    plotTemplateId: string;
    reasoning: string;
    boundAgents?: Record<string, string>;  // Role → entity ID
  }>;

  // Narrative weaving (connect existing plots)
  narrativeConnections: Array<{
    plot1InstanceId: string;
    plot2InstanceId: string;
    connection: string;
  }>;

  // The Fates' conversation
  transcript: ConversationExchange[];

  // Summary
  summary: string;
}

/**
 * FatesCouncilSystem - The Three Fates weave exotic/epic narratives
 */
export class FatesCouncilSystem extends BaseSystem {
  public readonly id: SystemId = 'fates_council';
  public readonly priority: number = 999;  // Last system, end of day
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  // Only run when souls or deities exist for the Fates to weave plots for
  public readonly activationComponents = [CT.SoulIdentity, CT.Deity] as const;
  protected readonly throttleInterval = 1;  // Check every tick for evening

  private lastCouncilDay = -1;
  private llmQueue: LLMDecisionQueue | null = null;
  private llmProvider?: { generate: (params: { prompt: string; temperature: number; maxTokens: number }) => Promise<{ text: string }> };

  // Recent exotic events tracked for council
  private recentExoticEvents: ExoticEvent[] = [];
  private readonly EVENT_RETENTION_DAYS = 1;  // Keep events for 1 day

  // Epic plot scanning
  private lastEpicScanTick = 0;
  private readonly EPIC_SCAN_INTERVAL = 50000;  // ~40 minutes real time at 20 TPS

  // Active council tracking
  private activeCouncil?: {
    context: FatesCouncilContext;
    transcript: ConversationExchange[];
    currentSpeaker: 'weaver' | 'spinner' | 'cutter';
    turnCount: number;
    tick: number;
    dayNumber: number;
    completed: boolean;
  };
  private turnInProgress = false;

  constructor(llmQueue?: LLMDecisionQueue) {
    super();
    this.llmQueue = llmQueue || null;
  }

  /**
   * Set LLM provider for Fates conversations
   */
  setLLMProvider(provider: { generate: (params: { prompt: string; temperature: number; maxTokens: number }) => Promise<{ text: string }> }): void {
    this.llmProvider = provider;
  }

  protected onInitialize(): void {
    // Subscribe to exotic events
    this.subscribeToExoticEvents();
  }

  protected onUpdate(ctx: SystemContext): void {
    if (!this.llmProvider) {
      return;  // Cannot function without LLM
    }

    // If council in progress, continue it
    if (this.activeCouncil && !this.activeCouncil.completed) {
      if (!this.turnInProgress) {
        this.turnInProgress = true;
        this.conductCouncilTurn(ctx.world, this.activeCouncil)
          .then(() => {
            this.turnInProgress = false;
          })
          .catch((error) => {
            console.error('[FatesCouncilSystem] Council turn failed:', error);
            this.turnInProgress = false;
            // Fallback: complete council with current progress
            if (this.activeCouncil && !this.activeCouncil.completed) {
              this.completeCouncil(ctx.world, this.activeCouncil);
            }
          });
      }
      return;
    }

    const timePhase = this.getTimePhase(ctx.tick);
    const currentDay = Math.floor(ctx.tick / TICKS_PER_DAY);

    // Only meet in evening, once per day
    if (timePhase !== 'evening') return;
    if (currentDay === this.lastCouncilDay) return;

    // Council time!
    this.lastCouncilDay = currentDay;
    this.conductFatesCouncil(ctx.world, ctx.tick, currentDay);

    // After council, scan for epic ascensions (periodic)
    this.scanForEpicAscensions(ctx.world, ctx.tick);
  }

  /**
   * Conduct the Fates' evening council
   */
  private conductFatesCouncil(world: World, tick: number, dayNumber: number): void {
    // Gather narrative context
    const context = this.gatherNarrativeContext(world, dayNumber);

    // Skip council if nothing interesting is happening
    if (context.potentialHooks.length === 0 && context.worldTension < 0.3) {
      return;
    }

    console.warn(`[FatesCouncilSystem] Council starting - Day ${dayNumber}, ${context.allThreads.length} threads, ${context.potentialHooks.length} hooks`);

    // Start the council
    this.activeCouncil = {
      context,
      transcript: [],
      currentSpeaker: 'weaver', // Weaver speaks first
      turnCount: 0,
      tick,
      dayNumber,
      completed: false,
    };
  }

  /**
   * Gather narrative context for the council
   */
  private gatherNarrativeContext(world: World, dayNumber: number): FatesCouncilContext {
    // Get ALL entities (souls, gods, deities, spirits)
    const allThreads: EntityThread[] = [];

    // Gather souls
    const souls = world.query().with(CT.SoulIdentity).executeEntities();
    for (const soul of souls) {
      const thread = this.analyzeSoulThread(soul, world);
      if (thread) allThreads.push(thread);
    }

    // Gather deities
    const deities = world.query().with(CT.Deity).executeEntities();
    for (const deity of deities) {
      const thread = this.analyzeDeityThread(deity, world);
      if (thread) allThreads.push(thread);
    }

    // TODO: Gather gods (player-god included here!)
    // TODO: Gather angels, demons, spirits

    // Find story hooks from recent events + entity state
    const potentialHooks = this.findStoryHooks(world, allThreads);

    // Calculate world tension
    const worldTension = this.calculateWorldTension(world, allThreads);

    // Count active exotic/epic plots
    let activeExotic = 0;
    let activeEpic = 0;
    for (const thread of allThreads) {
      // Count plot types from instance IDs
      // TODO: Actually check plot scale
      activeExotic += thread.activePlots.length;  // Simplified for now
    }

    return {
      allThreads,
      recentExoticEvents: this.recentExoticEvents,
      activeExoticPlots: activeExotic,
      activeEpicPlots: activeEpic,
      potentialHooks,
      worldTension,
      dayNumber,
      daysSinceLastCouncil: 1,
    };
  }

  /**
   * Analyze a soul entity as a narrative thread
   */
  private analyzeSoulThread(soul: Entity, world: World): EntityThread | null {
    const soulIdentity = soul.getComponent<SoulIdentityComponent>(CT.SoulIdentity);
    const plotLines = soul.getComponent<PlotLinesComponent>(CT.PlotLines);
    const thread = soul.getComponent<SilverThreadComponent>(CT.SilverThread);

    if (!soulIdentity || !plotLines) return null;

    // Gather active plots
    const activePlotIds = plotLines.active.map(p => p.instance_id);

    // Assess if needs challenge
    const headTick = thread?.head?.personal_tick ?? 0;
    const hasRecentPlot = plotLines.active.some(p =>
      headTick - p.assigned_at_personal_tick < 10000
    );
    const needsChallenge = !hasRecentPlot && (soulIdentity.wisdom_level ?? 0) > 20;

    // Check if overwhelmed
    const overwhelmed = plotLines.active.length > 5;

    // Calculate story potential based on current situation
    const storyPotential = this.assessStoryPotential(soul, world);

    // Build context summary
    const context = this.buildEntityContext(soul, world);

    // Extract recent actions from episodic memory
    const recentActions = this.extractRecentActions(soul);

    return {
      entityId: soul.id,
      entityType: 'soul',
      name: soulIdentity.true_name || soul.id,
      activePlots: activePlotIds,
      completedPlots: plotLines.completed.length,
      wisdom: soulIdentity.wisdom_level ?? 0,
      recentActions,
      storyPotential,
      needsChallenge,
      overwhelmed,
      context,
    };
  }

  /**
   * Analyze a deity entity as a narrative thread
   */
  private analyzeDeityThread(deity: Entity, world: World): EntityThread | null {
    const deityComp = deity.getComponent<DeityComponent>(CT.Deity);
    if (!deityComp) return null;

    // Deities can also have plots!
    const plotLines = deity.getComponent<PlotLinesComponent>(CT.PlotLines);

    // Extract recent actions from deity's episodic memory
    const recentActions = this.extractRecentActions(deity);

    // DeityComponent has identity field directly
    const deityName = deityComp.identity?.primaryName || deity.id;
    const deityDomain = deityComp.identity?.domain || 'unknown domain';

    // Use current belief as "wisdom" level for deities
    const deityWisdom = deityComp.belief?.currentBelief || 100;

    return {
      entityId: deity.id,
      entityType: 'deity',
      name: deityName,
      activePlots: plotLines?.active.map(p => p.instance_id) || [],
      completedPlots: plotLines?.completed.length || 0,
      wisdom: deityWisdom,
      recentActions,
      storyPotential: 0.5,  // Deities always have potential
      needsChallenge: false,
      overwhelmed: false,
      context: `Deity of ${deityDomain}`,
    };
  }

  /**
   * Assess how interesting an entity's current situation is (0-1)
   */
  private assessStoryPotential(entity: Entity, world: World): number {
    let potential = 0.3;  // Base potential

    // TODO: Implement sophisticated assessment:
    // - Recent major events (death, marriage, power gain/loss)
    // - Relationship tensions
    // - Unfulfilled goals
    // - Contradiction between actions and stated values
    // - Rising/falling trajectory

    return Math.min(1, potential);
  }

  /**
   * Build brief context string for an entity
   */
  private buildEntityContext(entity: Entity, world: World): string {
    // TODO: Build rich context from entity state
    // For now, simple placeholder
    return 'Entity in the world';
  }

  /**
   * Extract recent significant actions from an entity's episodic memory
   * Returns narrative-friendly action summaries for the Fates to consider
   */
  private extractRecentActions(entity: Entity, limit: number = 5): string[] {
    const memory = entity.getComponent<EpisodicMemoryComponent>(CT.EpisodicMemory);
    if (!memory) return [];

    // Get recent memories sorted by importance and recency
    const memories = memory.episodicMemories;
    if (memories.length === 0) return [];

    // Filter to significant memories (high importance or emotional intensity)
    const significantMemories = memories
      .filter((m) => m.importance >= 0.5 || m.emotionalIntensity >= 0.6)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    // Convert to narrative action summaries
    return significantMemories.map((m) => m.summary);
  }

  /**
   * Find story hooks from events and entity states
   */
  private findStoryHooks(world: World, threads: EntityThread[]): StoryHook[] {
    const hooks: StoryHook[] = [];

    // Check each recent exotic event
    for (const event of this.recentExoticEvents) {
      const thread = threads.find(t => t.entityId === event.entityId);
      if (!thread) continue;

      // Find candidate plots for this event type
      const candidates = this.findCandidatePlots(event, thread);
      if (candidates.length === 0) continue;

      // Assess narrative quality
      const narrativeQuality = this.assessNarrativeQuality(event, thread);

      hooks.push({
        event,
        affectedEntity: event.entityId,
        candidatePlots: candidates,
        narrativeQuality,
        poeticJustice: this.detectPoeticJustice(event, thread),
      });
    }

    // Also check entity states (stale threads needing challenge)
    for (const thread of threads) {
      if (thread.needsChallenge && !thread.overwhelmed) {
        // This thread needs a plot even without an event
        hooks.push({
          event: {
            type: 'stale_thread',
            entityId: thread.entityId,
            description: `${thread.name} has grown too comfortable`,
            tick: world.tick,
            severity: 0.6,
          },
          affectedEntity: thread.entityId,
          candidatePlots: ['exotic_divine_reckoning', 'exotic_tyrant_you_became'],  // Generic challenges
          narrativeQuality: 0.7,
        });
      }
    }

    return hooks;
  }

  /**
   * Find candidate exotic/epic plots for an event + entity
   */
  private findCandidatePlots(event: ExoticEvent, thread: EntityThread): string[] {
    const candidates: string[] = [];

    // Map event types to plot templates
    switch (event.type) {
      case 'deity_relationship_critical':
        candidates.push('exotic_divine_reckoning');
        break;
      case 'multiverse_invasion':
        candidates.push('exotic_from_beyond_veil');
        break;
      case 'paradigm_conflict':
        candidates.push('exotic_when_magics_collide');
        break;
      case 'dimensional_encounter':
        candidates.push('exotic_what_dwells_between');
        break;
      case 'political_elevation':
        candidates.push('exotic_tyrant_you_became');
        break;
      case 'time_paradox':
        candidates.push('exotic_price_changing_yesterday');
        break;
      case 'prophecy_given':
        candidates.push('exotic_prophecy_trap');
        break;
      case 'champion_chosen':
        candidates.push('exotic_burden_being_chosen');
        break;
    }

    // Check wisdom requirements
    // TODO: Filter based on thread.wisdom and plot requirements

    return candidates;
  }

  /**
   * Assess narrative quality of assigning this plot to this entity (0-1)
   */
  private assessNarrativeQuality(event: ExoticEvent, thread: EntityThread): number {
    let quality = event.severity;  // Start with event severity

    // Bonus for poetic justice
    if (this.detectPoeticJustice(event, thread)) {
      quality += 0.2;
    }

    // Penalty if overwhelmed with plots
    if (thread.overwhelmed) {
      quality *= 0.3;
    }

    // Bonus if thread needs challenge
    if (thread.needsChallenge) {
      quality += 0.15;
    }

    return Math.min(1, quality);
  }

  /**
   * Detect if there's poetic justice in this event → plot assignment
   */
  private detectPoeticJustice(event: ExoticEvent, thread: EntityThread): string | undefined {
    // TODO: Implement sophisticated pattern detection
    // For now, simple examples:

    if (event.type === 'deity_relationship_critical' && thread.completedPlots > 5) {
      return 'They have ignored the divine throughout their lives; now a god demands their attention';
    }

    if (event.type === 'political_elevation' && thread.wisdom < 30) {
      return 'Power granted to the unprepared - classic hubris setup';
    }

    return undefined;
  }

  /**
   * Calculate world tension (0 = peaceful, 1 = chaotic)
   */
  private calculateWorldTension(world: World, threads: EntityThread[]): number {
    let tension = 0;

    // Base tension from exotic events
    tension += this.recentExoticEvents.length * 0.1;

    // Tension from active exotic plots
    const activeExoticCount = threads.reduce((sum, t) => sum + t.activePlots.length, 0);
    tension += activeExoticCount * 0.05;

    // TODO: Add world state factors (wars, plagues, divine interventions)

    return Math.min(1, tension);
  }

  /**
   * Generate LLM prompt for Fates council
   */
  private generateCouncilPrompt(context: FatesCouncilContext): string {
    let prompt = `You are the THREE FATES conducting your evening council on Day ${context.dayNumber}.\n`;
    prompt += `You weave the narrative threads of ALL entities - souls, gods, spirits, deities.\n`;
    prompt += `You know nothing of "players" or "games." You only see STORIES.\n\n`;

    // Fate personas
    prompt += `🧵 THE WEAVER (Purpose) - ${FATE_PERSONAS.weaver.personality.split('\\n')[0]}\n`;
    prompt += `🌀 THE SPINNER (Nature) - ${FATE_PERSONAS.spinner.personality.split('\\n')[0]}\n`;
    prompt += `✂️ THE CUTTER (Destiny) - ${FATE_PERSONAS.cutter.personality.split('\\n')[0]}\n\n`;

    prompt += `═══════════════════════════════════════════\n`;
    prompt += `CURRENT TAPESTRY STATE\n`;
    prompt += `═══════════════════════════════════════════\n\n`;

    prompt += `Threads in the Weave: ${context.allThreads.length}\n`;
    prompt += `Active Exotic Narratives: ${context.activeExoticPlots}\n`;
    prompt += `Active Epic Narratives: ${context.activeEpicPlots}\n`;
    prompt += `World Tension: ${context.worldTension > 0.7 ? 'HIGH (chaos reigns)' : context.worldTension > 0.4 ? 'MODERATE' : 'LOW (peaceful times)'}\n\n`;

    // Recent exotic events
    if (context.recentExoticEvents.length > 0) {
      prompt += `Recent Exotic Events (last day):\n`;
      for (const event of context.recentExoticEvents.slice(0, 10)) {
        prompt += `  - ${event.description}\n`;
      }
      prompt += `\n`;
    }

    // Threads of note (high story potential)
    const notableThreads = context.allThreads
      .filter(t => t.storyPotential > 0.6 || t.needsChallenge)
      .slice(0, 15);

    if (notableThreads.length > 0) {
      prompt += `Threads of Note:\n`;
      for (const thread of notableThreads) {
        const status = thread.needsChallenge ? '[NEEDS CHALLENGE]' : thread.overwhelmed ? '[OVERWHELMED]' : '';
        prompt += `  - ${thread.name} (${thread.entityType}, wisdom: ${thread.wisdom}) ${status}\n`;
        prompt += `    ${thread.context}\n`;
        if (thread.activePlots.length > 0) {
          prompt += `    Active plots: ${thread.activePlots.length}\n`;
        }
      }
      prompt += `\n`;
    }

    // Story hooks
    if (context.potentialHooks.length > 0) {
      prompt += `Potential Story Hooks:\n`;
      for (const hook of context.potentialHooks.slice(0, 10)) {
        prompt += `  - ${hook.event.description}\n`;
        prompt += `    Candidate plots: ${hook.candidatePlots.join(', ')}\n`;
        prompt += `    Narrative quality: ${(hook.narrativeQuality * 100).toFixed(0)}%\n`;
        if (hook.poeticJustice) {
          prompt += `    Poetic justice: ${hook.poeticJustice}\n`;
        }
      }
      prompt += `\n`;
    }

    prompt += `═══════════════════════════════════════════\n`;
    prompt += `YOUR TASK\n`;
    prompt += `═══════════════════════════════════════════\n\n`;

    prompt += `Discuss among yourselves:\n`;
    prompt += `1. Which threads need exotic/epic plots woven?\n`;
    prompt += `2. Which entities (souls, gods, spirits) need challenge?\n`;
    prompt += `3. Should peaceful times continue, or does the tapestry need drama?\n`;
    prompt += `4. How to create poetic justice and compelling arcs?\n\n`;

    prompt += `IMPORTANT: You see ALL entities equally. Gods are not exempt from fate.\n`;
    prompt += `A god who ignores mortals may face divine reckoning.\n`;
    prompt += `A soul who defies gods may ascend through your will.\n\n`;

    prompt += `CONVERSATION FORMAT:\n`;
    prompt += `🧵 Weaver speaks first - examines the pattern\n`;
    prompt += `🌀 Spinner suggests - proposes story additions\n`;
    prompt += `✂️ Cutter decides - pronounces which to weave\n`;
    prompt += `Then debate if needed (2-3 rounds max).\n\n`;

    prompt += `FINAL OUTPUT:\n`;
    prompt += `After your conversation, provide JSON:\n`;
    prompt += `{\n`;
    prompt += `  "plotAssignments": [\n`;
    prompt += `    { "entityId": "...", "plotTemplateId": "exotic_...", "reasoning": "..." }\n`;
    prompt += `  ],\n`;
    prompt += `  "summary": "Brief summary of council decisions"\n`;
    prompt += `}\n\n`;

    prompt += `Begin the council. Speak as the Three Fates.\n`;

    return prompt;
  }

  /**
   * Conduct one turn of the council (one Fate speaks)
   */
  private async conductCouncilTurn(world: World, council: typeof this.activeCouncil): Promise<void> {
    if (!council) return;

    // Maximum turns to prevent infinite loops
    if (council.turnCount >= 5) {
      this.completeCouncil(world, council);
      return;
    }


    // Generate prompt for current speaker
    const prompt = this.generateFatePromptForCouncil(
      council.currentSpeaker,
      council.context,
      council.transcript
    );

    // Get response from LLM
    let response: string;
    let thoughts: string | undefined;

    if (!this.llmProvider) {
      console.warn('[FatesCouncilSystem] No LLM provider, using placeholder');
      response = this.getPlaceholderCouncilResponse(council.currentSpeaker, council.context);
    } else {
      try {
        const llmResponse = await this.llmProvider.generate({
          prompt,
          temperature: 0.8, // Creative but not random
          maxTokens: 500,   // Room for reasoning + speech
        });
        let fullResponse = llmResponse.text.trim();

        // Extract thinking content (same pattern as SoulCreationSystem)
        const completeThinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)<\/thinking>/i);
        const completeThinkMatch = fullResponse.match(/<think>([\s\S]*?)<\/think>/i);
        const incompleteThinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)$/i);
        const incompleteThinkMatch = fullResponse.match(/<think>([\s\S]*?)$/i);

        thoughts = completeThinkingMatch?.[1]?.trim()
          || completeThinkMatch?.[1]?.trim()
          || incompleteThinkingMatch?.[1]?.trim()
          || incompleteThinkMatch?.[1]?.trim();

        // Strip thinking content
        response = fullResponse
          .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/<thinking>[\s\S]*$/gi, '')
          .replace(/<think>[\s\S]*$/gi, '')
          .trim();

        // If response is empty after stripping, use placeholder
        if (!response || response.length === 0) {
          console.warn('[FatesCouncilSystem] LLM returned only thinking content, using placeholder');
          response = this.getPlaceholderCouncilResponse(council.currentSpeaker, council.context);
          if (!thoughts) {
            thoughts = fullResponse;
          }
        }
      } catch (error) {
        console.warn('[FatesCouncilSystem] LLM failed, using placeholder:', error);
        response = this.getPlaceholderCouncilResponse(council.currentSpeaker, council.context);
      }
    }

    // Add to transcript
    const exchange: ConversationExchange = {
      speaker: council.currentSpeaker,
      text: response,
      thoughts,
      tick: world.tick,
      topic: this.determineCouncilTopic(council.turnCount),
    };

    council.transcript.push(exchange);

    // Advance to next speaker
    council.turnCount++;

    if (council.turnCount < 3) {
      // First three turns: Weaver → Spinner → Cutter
      if (council.currentSpeaker === 'weaver') {
        council.currentSpeaker = 'spinner';
      } else if (council.currentSpeaker === 'spinner') {
        council.currentSpeaker = 'cutter';
      } else {
        // After initial pronouncements, complete council
        if (!council.completed) {
          this.completeCouncil(world, council);
        }
      }
    } else {
      // After turn 3, council ends
      if (!council.completed) {
        this.completeCouncil(world, council);
      }
    }
  }

  /**
   * Complete the council and execute decisions
   */
  private async completeCouncil(world: World, council: typeof this.activeCouncil): Promise<void> {
    if (!council) return;

    // Mark as completed
    council.completed = true;

    // Parse decisions from conversation
    const decision = await this.parseFatesDecisions(world, council);

    // Execute the decisions
    this.executeFatesDecisions(decision, world, council.tick);

    // Log completion
    console.warn(`[FatesCouncilSystem] Council complete: ${decision.summary}`);

    // Clear active council
    this.activeCouncil = undefined;
  }

  /**
   * Parse the Fates' decisions from their conversation
   */
  private async parseFatesDecisions(world: World, council: typeof this.activeCouncil): Promise<FatesDecision> {
    if (!council) {
      return {
        plotAssignments: [],
        narrativeConnections: [],
        transcript: [],
        summary: 'Council failed',
      };
    }

    // Build extraction prompt
    const extractionPrompt = this.generateDecisionExtractionPrompt(council.context, council.transcript);

    let plotAssignments: FatesDecision['plotAssignments'] = [];
    let summary = 'The Fates observed the tapestry but made no changes.';

    if (this.llmProvider) {
      try {
        const llmResponse = await this.llmProvider.generate({
          prompt: extractionPrompt,
          temperature: 0.3, // More deterministic for extraction
          maxTokens: 500,
        });

        // Extract JSON from response
        const jsonMatch = llmResponse.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.plotAssignments && Array.isArray(parsed.plotAssignments)) {
            plotAssignments = parsed.plotAssignments;
          }
          if (parsed.summary && typeof parsed.summary === 'string') {
            summary = parsed.summary;
          }
        }
      } catch (error) {
        console.warn('[FatesCouncilSystem] Failed to parse decisions from conversation:', error);
      }
    }

    return {
      plotAssignments,
      narrativeConnections: [], // TODO: Implement narrative connections
      transcript: council.transcript,
      summary,
    };
  }

  /**
   * Execute the Fates' decisions (assign plots, weave connections)
   */
  private executeFatesDecisions(decision: FatesDecision, world: World, tick: number): void {
    console.warn(`[FatesCouncilSystem] Executing ${decision.plotAssignments.length} plot assignments...`);

    for (const assignment of decision.plotAssignments) {
      this.assignPlotToEntity(
        assignment.entityId,
        assignment.plotTemplateId,
        world,
        tick,
        assignment.reasoning,
        assignment.boundAgents
      );
    }

    // TODO: Execute narrative connections

    console.warn(`[FatesCouncilSystem] Council Summary: ${decision.summary}`);
  }

  /**
   * Assign an exotic/epic plot to an entity
   */
  private assignPlotToEntity(
    entityId: string,
    plotTemplateId: string,
    world: World,
    tick: number,
    reasoning: string,
    boundAgents?: Record<string, string>
  ): void {
    const entity = world.getEntity(entityId);
    if (!entity) {
      console.warn(`[FatesCouncilSystem] Cannot assign plot - entity ${entityId} not found`);
      return;
    }

    // Get PlotLines component
    const plotLines = entity.getComponent<PlotLinesComponent>(CT.PlotLines);
    if (!plotLines) {
      console.warn(`[FatesCouncilSystem] Entity ${entityId} has no PlotLines component - skipping plot assignment`);
      return;
    }

    // Get soul ID (for souls) or use entity ID
    const soulIdentity = entity.getComponent<SoulIdentityComponent>(CT.SoulIdentity);
    const thread = entity.getComponent<SilverThreadComponent>(CT.SilverThread);
    const soulId = soulIdentity?.true_name || entityId;
    const personalTick = thread?.head?.personal_tick || tick;

    // Instantiate plot
    const plotInstance = instantiatePlot(
      plotTemplateId,
      soulId,
      personalTick,
      boundAgents || {}
    );

    if (!plotInstance) {
      console.warn(`[FatesCouncilSystem] Failed to instantiate plot ${plotTemplateId}`);
      return;
    }

    // Create updated PlotLines component with new plot (immutable pattern)
    const updatedPlotLines: PlotLinesComponent = {
      ...plotLines,
      active: [...plotLines.active, plotInstance],
    };

    // Update the component in the world
    if ('addComponent' in world && typeof world.addComponent === 'function') {
      world.addComponent(entityId, updatedPlotLines);
    } else {
      throw new Error('[FatesCouncilSystem] World.addComponent is not available');
    }

    console.warn(`[FatesCouncilSystem] Plot woven: ${plotTemplateId} → ${soulId} (${reasoning})`);
  }

  /**
   * Subscribe to exotic events
   */
  private subscribeToExoticEvents(): void {
    // Subscribe to divinity events
    this.events.onGeneric('divinity:deity_relationship_critical', (data: unknown) => {
      interface DeityRelationshipData {
        agentId: string;
        tick: number;
      }
      if (!data || typeof data !== 'object' || !('agentId' in data) || !('tick' in data)) {
        console.error('[FatesCouncilSystem] Invalid deity_relationship_critical data:', data);
        return;
      }
      const eventData = data as DeityRelationshipData;
      this.trackExoticEvent({
        type: 'deity_relationship_critical',
        entityId: eventData.agentId,
        description: `Deity relationship reached critical level`,
        tick: eventData.tick,
        severity: 0.8,
      });
    });

    // Subscribe to multiverse invasion
    this.events.onGeneric('multiverse:invasion_triggered', (data: unknown) => {
      interface MultiverseInvasionData {
        invaderUniverse: string;
      }
      if (!data || typeof data !== 'object' || !('invaderUniverse' in data)) {
        console.error('[FatesCouncilSystem] Invalid invasion_triggered data:', data);
        return;
      }
      const eventData = data as MultiverseInvasionData;
      this.trackExoticEvent({
        type: 'multiverse_invasion',
        entityId: 'universe',  // Affects whole universe
        description: `Invasion from ${eventData.invaderUniverse}`,
        tick: this.world?.tick || 0,
        severity: 0.9,
      });
    });

    // TODO: Subscribe to other exotic events:
    // - magic:paradigm_conflict_detected
    // - companion:dimensional_encounter
    // - governance:political_elevation
    // - time:paradox_detected
    // - divinity:prophecy_given
    // - divinity:champion_chosen
  }

  /**
   * Track an exotic event for the council
   */
  private trackExoticEvent(event: ExoticEvent): void {
    this.recentExoticEvents.push(event);

    // Prune old events (keep last 24 hours)
    const cutoffTick = (this.world?.tick || 0) - (TICKS_PER_DAY * this.EVENT_RETENTION_DAYS);
    this.recentExoticEvents = this.recentExoticEvents.filter(e => e.tick >= cutoffTick);
  }

  /**
   * Generate prompt for a specific Fate during council
   */
  private generateFatePromptForCouncil(
    fate: 'weaver' | 'spinner' | 'cutter',
    context: FatesCouncilContext,
    transcript: ConversationExchange[]
  ): string {
    const persona = FATE_PERSONAS[fate];

    let prompt = `${persona.personality}\n\n`;
    prompt += `FATES COUNCIL - Day ${context.dayNumber}\n`;
    prompt += `═══════════════════════\n\n`;

    // Context summary
    prompt += `TAPESTRY STATE:\n`;
    prompt += `- ${context.allThreads.length} threads (souls, gods, deities)\n`;
    prompt += `- ${context.potentialHooks.length} story opportunities\n`;
    prompt += `- World tension: ${context.worldTension > 0.7 ? 'HIGH' : context.worldTension > 0.4 ? 'MODERATE' : 'LOW'}\n\n`;

    // Recent events
    if (context.recentExoticEvents.length > 0) {
      prompt += `Recent Events:\n`;
      for (const event of context.recentExoticEvents.slice(0, 5)) {
        prompt += `- ${event.description}\n`;
      }
      prompt += `\n`;
    }

    // Story hooks
    if (context.potentialHooks.length > 0) {
      prompt += `Story Opportunities:\n`;
      for (const hook of context.potentialHooks.slice(0, 5)) {
        prompt += `- ${hook.event.description}\n`;
        if (hook.poeticJustice) {
          prompt += `  Justice: ${hook.poeticJustice}\n`;
        }
      }
      prompt += `\n`;
    }

    // Conversation so far
    if (transcript.length > 0) {
      prompt += `CONVERSATION SO FAR:\n`;
      for (const exchange of transcript) {
        const speaker = this.getFateName(exchange.speaker);
        prompt += `${speaker}: "${exchange.text}"\n`;
      }
      prompt += `\n`;
    }

    // What to do now
    prompt += `YOUR TURN:\n`;
    if (transcript.length === 0 && fate === 'weaver') {
      prompt += `Speak first. Examine the tapestry and identify which threads need exotic/epic plots.\n`;
    } else if (transcript.length === 1 && fate === 'spinner') {
      prompt += `The Weaver has spoken. Consider their observations and suggest specific plot assignments.\n`;
    } else if (transcript.length === 2 && fate === 'cutter') {
      prompt += `The Weaver and Spinner have spoken. Pronounce which plots should be woven and why.\n`;
    } else {
      prompt += `Add your final thoughts or agreement.\n`;
    }

    prompt += `\nIMPORTANT: Put reasoning in <think> tags. Only your speech should be outside tags.\n`;
    prompt += `Speak as ${persona.name}. Keep response to 2-4 sentences.\n`;

    return prompt;
  }

  /**
   * Generate extraction prompt for parsing decisions
   */
  private generateDecisionExtractionPrompt(
    context: FatesCouncilContext,
    transcript: ConversationExchange[]
  ): string {
    let prompt = `Extract plot assignments from this Fates council:\n\n`;

    for (const exchange of transcript) {
      const speaker = this.getFateName(exchange.speaker);
      prompt += `${speaker}: "${exchange.text}"\n`;
    }

    prompt += `\nAvailable exotic plots:\n`;
    prompt += `- exotic_divine_reckoning (deity relationship critical)\n`;
    prompt += `- exotic_from_beyond_veil (multiverse invasion)\n`;
    prompt += `- exotic_when_magics_collide (paradigm conflict)\n`;
    prompt += `- exotic_tyrant_you_became (political elevation)\n`;
    prompt += `- exotic_prophecy_trap (prophecy given)\n`;
    prompt += `- exotic_burden_being_chosen (champion chosen)\n\n`;

    prompt += `Based on the conversation, extract:\n`;
    prompt += `1. Which entities should receive exotic plots?\n`;
    prompt += `2. Which plot templates fit their situations?\n`;
    prompt += `3. Why this assignment is narratively appropriate?\n\n`;

    prompt += `Respond in this exact JSON format:\n`;
    prompt += `{\n`;
    prompt += `  "plotAssignments": [\n`;
    prompt += `    { "entityId": "entity_id", "plotTemplateId": "exotic_...", "reasoning": "why this fits" }\n`;
    prompt += `  ],\n`;
    prompt += `  "summary": "Brief summary of council decisions"\n`;
    prompt += `}\n\n`;
    prompt += `Only output JSON, nothing else.`;

    return prompt;
  }

  /**
   * Get Fate name with symbol
   */
  private getFateName(speaker: string): string {
    switch (speaker) {
      case 'weaver':
        return '🧵 The Weaver';
      case 'spinner':
        return '🌀 The Spinner';
      case 'cutter':
        return '✂️ The Cutter';
      default:
        return speaker;
    }
  }

  /**
   * Determine topic based on turn count
   */
  private determineCouncilTopic(turnCount: number): ConversationExchange['topic'] {
    if (turnCount === 0) return 'examination';
    if (turnCount === 1) return 'purpose';
    if (turnCount === 2) return 'destiny';
    return 'finalization';
  }

  /**
   * Placeholder council response
   */
  private getPlaceholderCouncilResponse(
    speaker: 'weaver' | 'spinner' | 'cutter',
    context: FatesCouncilContext
  ): string {
    if (speaker === 'weaver') {
      if (context.potentialHooks.length > 0) {
        const hook = context.potentialHooks[0];
        return `I see ${hook?.event.description}. This thread requires exotic challenge to test their mettle.`;
      }
      return 'I observe the tapestry. The threads are peaceful, but growth requires challenge.';
    } else if (speaker === 'spinner') {
      return 'I suggest we weave divine reckoning for those who have grown too comfortable in their power.';
    } else {
      return 'So it shall be. Let the exotic threads be woven into the tapestry.';
    }
  }

  /**
   * Get time phase from tick
   */
  private getTimePhase(tick: number): TimePhase {
    const dayProgress = (tick % TICKS_PER_DAY) / TICKS_PER_DAY;

    if (dayProgress < 0.25) return 'night';
    if (dayProgress < 0.5) return 'morning';
    if (dayProgress < 0.75) return 'afternoon';
    return 'evening';
  }

  /**
   * Scan for souls ready for epic ascension plots
   *
   * Epic plots are assigned based on:
   * - Wisdom >= 100
   * - Completed 5+ large-scale plots
   * - Lesson/affinity-based template selection
   * - Periodic scan every 50,000 ticks (~40 minutes real time)
   */
  private scanForEpicAscensions(world: World, tick: number): void {
    // Throttle to scan interval
    if (tick - this.lastEpicScanTick < this.EPIC_SCAN_INTERVAL) {
      return;
    }

    this.lastEpicScanTick = tick;

    // Query souls with required components
    const souls = world.query()
      .with(CT.SoulIdentity)
      .with(CT.PlotLines)
      .executeEntities();

    let eligibleCount = 0;
    let assignedCount = 0;

    for (const soul of souls) {
      const soulIdentity = soul.getComponent<SoulIdentityComponent>(CT.SoulIdentity);
      const plotLines = soul.getComponent<PlotLinesComponent>(CT.PlotLines);

      if (!soulIdentity || !plotLines) continue;

      // Check eligibility
      if (!this.isEligibleForEpicPlot(soulIdentity, plotLines)) {
        continue;
      }

      eligibleCount++;

      // Select appropriate epic template
      const templateId = this.selectEpicTemplate(soul, soulIdentity, plotLines, world);

      if (!templateId) {
        continue;
      }

      // Assign the epic plot
      const thread = soul.getComponent(CT.SilverThread) as SilverThreadComponent | undefined;
      const personalTick = thread?.head?.personal_tick || tick;

      console.warn(`[FatesCouncilSystem] EPIC ASCENSION: ${soulIdentity.true_name} → ${templateId} (wisdom: ${soulIdentity.wisdom_level})`);

      this.assignPlotToEntity(
        soul.id,
        templateId,
        world,
        tick,
        `Epic ascension granted by the Fates for reaching wisdom ${soulIdentity.wisdom_level}`,
        {}
      );

      assignedCount++;
    }

    if (eligibleCount > 0) {
      console.warn(`[FatesCouncilSystem] Epic scan complete: ${eligibleCount} eligible, ${assignedCount} assigned`);
    }
  }

  /**
   * Check if soul is eligible for epic plot assignment
   */
  private isEligibleForEpicPlot(
    soulIdentity: SoulIdentityComponent,
    plotLines: PlotLinesComponent
  ): boolean {
    // Must have wisdom >= 100
    if ((soulIdentity.wisdom_level ?? 0) < 100) {
      return false;
    }

    // Must have completed 5+ large-scale plots
    const largePlotCount = plotLines.completed.filter(p => {
      // Count large and epic plots
      const template = plotLineRegistry.getTemplate(p.template_id);
      return template && (template.scale === 'large' || template.scale === 'epic');
    }).length;

    if (largePlotCount < 5) {
      return false;
    }

    // Must not have an active epic plot
    const hasActiveEpic = plotLines.active.some(p => {
      const template = plotLineRegistry.getTemplate(p.template_id);
      return template && template.scale === 'epic';
    });

    if (hasActiveEpic) {
      return false;
    }

    return true;
  }

  /**
   * Select epic template based on soul's lessons and affinities
   *
   * Template selection logic:
   * - Fae Ascension: nature_harmony OR communion_with_wild, has nature skills
   * - Enochian Ascension: purity OR divine_devotion, has strong deity relationship
   * - Exaltation Path: family_creation OR legacy_building, has many descendants
   * - Default: Random if wisdom >= 100 but no clear affinity
   */
  private selectEpicTemplate(
    entity: Entity,
    soulIdentity: SoulIdentityComponent,
    plotLines: PlotLinesComponent,
    world: World
  ): string | null {
    // Extract lesson IDs
    const lessonIds = soulIdentity.lessons_learned.map(l => l.lesson_id);
    const lessonInsights = soulIdentity.lessons_learned.map(l => l.insight.toLowerCase());

    // Check for Fae Ascension affinity
    const hasNatureAffinity =
      lessonIds.some(id => id.includes('nature') || id.includes('wild') || id.includes('harmony')) ||
      lessonInsights.some(insight =>
        insight.includes('nature') ||
        insight.includes('wild') ||
        insight.includes('communion') ||
        insight.includes('druid')
      );

    const hasNatureSkills = this.hasSkillAffinity(entity, ['gathering', 'farming', 'animal_handling']);

    if (hasNatureAffinity && hasNatureSkills) {
      return 'epic_endless_summer';
    }

    // Check for Enochian Ascension affinity
    const hasPurityAffinity =
      lessonIds.some(id => id.includes('purity') || id.includes('divine') || id.includes('devotion')) ||
      lessonInsights.some(insight =>
        insight.includes('purity') ||
        insight.includes('divine') ||
        insight.includes('devotion') ||
        insight.includes('angel') ||
        insight.includes('celestial')
      );

    const hasStrongDeityRelationship = this.hasDeityRelationship(entity, world, 90);

    if (hasPurityAffinity && hasStrongDeityRelationship) {
      return 'epic_enochian_ascension';
    }

    // Check for Exaltation Path affinity
    const hasFamilyAffinity =
      lessonIds.some(id => id.includes('family') || id.includes('legacy') || id.includes('descendant')) ||
      lessonInsights.some(insight =>
        insight.includes('family') ||
        insight.includes('legacy') ||
        insight.includes('descendant') ||
        insight.includes('children') ||
        insight.includes('creation')
      );

    const hasDescendants = this.countDescendants(entity, world) >= 10;

    if (hasFamilyAffinity && hasDescendants) {
      return 'epic_exaltation_path';
    }

    // Default: If no clear affinity but eligible, pick based on strongest tendency
    // Count affinity scores
    const scores = {
      nature: (hasNatureAffinity ? 2 : 0) + (hasNatureSkills ? 1 : 0),
      purity: (hasPurityAffinity ? 2 : 0) + (hasStrongDeityRelationship ? 1 : 0),
      family: (hasFamilyAffinity ? 2 : 0) + (hasDescendants ? 1 : 0),
    };

    // Pick highest score
    const maxScore = Math.max(scores.nature, scores.purity, scores.family);
    if (maxScore === 0) {
      // No affinity at all - pick random
      const templates = ['epic_endless_summer', 'epic_enochian_ascension', 'epic_exaltation_path'];
      return templates[Math.floor(Math.random() * templates.length)] || null;
    }

    if (scores.nature === maxScore) return 'epic_endless_summer';
    if (scores.purity === maxScore) return 'epic_enochian_ascension';
    if (scores.family === maxScore) return 'epic_exaltation_path';

    return null;
  }

  /**
   * Check if entity has skill affinity (any skill at level 2+)
   */
  private hasSkillAffinity(entity: Entity, skills: string[]): boolean {
    interface SkillsComponent {
      type: 'skills';
      levels?: Record<string, number>;
    }

    const skillsComp = entity.getComponent(CT.Skills) as SkillsComponent | undefined;
    if (!skillsComp) return false;

    const levels = skillsComp.levels || {};
    return skills.some(skill => (levels[skill] ?? 0) >= 2);
  }

  /**
   * Check if entity has strong deity relationship
   */
  private hasDeityRelationship(entity: Entity, world: World, minTrust: number): boolean {
    interface RelationshipData {
      trust?: number;
    }
    interface RelationshipComponent {
      type: 'relationship';
      relationships?: Map<string, RelationshipData>;
    }

    const relationships = entity.getComponent(CT.Relationship) as RelationshipComponent | undefined;
    if (!relationships) return false;

    const relMap = relationships.relationships || new Map();

    // Check all relationships for deity with high trust
    for (const [targetId, rel] of relMap.entries()) {
      const targetEntity = world.getEntity(targetId);
      if (!targetEntity) continue;

      const isDeity = targetEntity.hasComponent(CT.Deity);
      if (!isDeity) continue;

      const trust = rel.trust ?? 0;
      if (trust >= minTrust) {
        return true;
      }
    }

    return false;
  }

  /**
   * Count descendants of entity
   */
  private countDescendants(entity: Entity, world: World): number {
    interface ChildResponsibility {
      childId?: string;
    }
    interface ParentingComponent {
      type: 'parenting';
      children?: Array<string | ChildResponsibility>;
    }

    // Check for parenting component
    const parenting = entity.getComponent(CT.Parenting) as ParentingComponent | undefined;
    if (!parenting) return 0;

    const responsibilities = parenting.children || [];
    let count = responsibilities.length;

    // Recursively count descendants
    for (const resp of responsibilities) {
      const childId = typeof resp === 'string' ? resp : resp.childId;
      if (!childId) continue;

      const childEntity = world.getEntity(childId);
      if (childEntity) {
        count += this.countDescendants(childEntity, world);
      }
    }

    return count;
  }

  protected onCleanup(): void {
    this.recentExoticEvents = [];
  }
}
