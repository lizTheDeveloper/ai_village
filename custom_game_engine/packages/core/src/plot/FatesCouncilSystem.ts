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
  protected readonly throttleInterval = 1;  // Check every tick for evening

  private lastCouncilDay = -1;
  private llmQueue: LLMDecisionQueue | null = null;
  private llmProvider?: any; // LLMProvider type from LLMTypes

  // Recent exotic events tracked for council
  private recentExoticEvents: ExoticEvent[] = [];
  private readonly EVENT_RETENTION_DAYS = 1;  // Keep events for 1 day

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
  setLLMProvider(provider: any): void {
    this.llmProvider = provider;
  }

  protected onInitialize(): void {
    // Subscribe to exotic events
    this.subscribeToExoticEvents();

    console.log('[FatesCouncilSystem] The Three Fates begin their watch over the narrative tapestry');
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
  }

  /**
   * Conduct the Fates' evening council
   */
  private conductFatesCouncil(world: World, tick: number, dayNumber: number): void {
    console.log(`[FatesCouncilSystem] Evening falls. The Three Fates convene... (Day ${dayNumber})`);

    // Gather narrative context
    const context = this.gatherNarrativeContext(world, dayNumber);

    // Skip council if nothing interesting is happening
    if (context.potentialHooks.length === 0 && context.worldTension < 0.3) {
      console.log('[FatesCouncilSystem] The tapestry is peaceful. The Fates observe in silence.');
      return;
    }

    console.log(`[FatesCouncilSystem] ${context.allThreads.length} threads examined, ${context.potentialHooks.length} story hooks found`);

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

    // Emit event that council has begun (using generic pattern for custom event)
    console.log(`[FatesCouncilSystem] Council starting - ${context.allThreads.length} threads, ${context.potentialHooks.length} hooks`);
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
    const soulIdentity = soul.getComponent(CT.SoulIdentity) as SoulIdentityComponent | undefined;
    const plotLines = soul.getComponent(CT.PlotLines) as PlotLinesComponent | undefined;
    const thread = soul.getComponent(CT.SilverThread);

    if (!soulIdentity || !plotLines) return null;

    // Gather active plots
    const activePlotIds = plotLines.active.map(p => p.instance_id);

    // Assess if needs challenge
    const hasRecentPlot = plotLines.active.some(p =>
      ((thread as any)?.head?.personal_tick ?? 0) - p.assigned_at_personal_tick < 10000
    );
    const needsChallenge = !hasRecentPlot && ((soulIdentity as any).wisdom_level ?? 0) > 20;

    // Check if overwhelmed
    const overwhelmed = plotLines.active.length > 5;

    // Calculate story potential based on current situation
    const storyPotential = this.assessStoryPotential(soul, world);

    // Build context summary
    const context = this.buildEntityContext(soul, world);

    return {
      entityId: soul.id,
      entityType: 'soul',
      name: (soulIdentity as any).soulName || soul.id,
      activePlots: activePlotIds,
      completedPlots: plotLines.completed.length,
      wisdom: (soulIdentity as any).wisdom_level ?? 0,
      recentActions: [],  // TODO: Extract from recent events
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
    const deityComp = deity.getComponent(CT.Deity) as DeityComponent | undefined;
    if (!deityComp) return null;

    // Deities can also have plots!
    const plotLines = deity.getComponent(CT.PlotLines) as PlotLinesComponent | undefined;

    return {
      entityId: deity.id,
      entityType: 'deity',
      name: (deityComp as any).identity?.primaryName || deity.id,
      activePlots: plotLines?.active.map(p => p.instance_id) || [],
      completedPlots: plotLines?.completed.length || 0,
      wisdom: (deityComp as any).divinePower || 100,  // Use divine power as "wisdom"
      recentActions: [],  // TODO: deity activities
      storyPotential: 0.5,  // Deities always have potential
      needsChallenge: false,
      overwhelmed: false,
      context: `Deity of ${(deityComp as any).domain || 'unknown domain'}`,
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

    // Log that this Fate is thinking
    console.log(`[FatesCouncilSystem] ${this.getFateName(council.currentSpeaker)} is thinking...`);

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

    // Log the Fate's speech
    console.log(`[FatesCouncilSystem] ${this.getFateName(council.currentSpeaker)}: ${response}`);

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

    console.log(`[FatesCouncilSystem] The Fates have concluded their council.`);

    // Parse decisions from conversation
    const decision = await this.parseFatesDecisions(world, council);

    // Execute the decisions
    this.executeFatesDecisions(decision, world, council.tick);

    // Log completion
    console.log(`[FatesCouncilSystem] Council complete: ${decision.summary}`);

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
    console.log(`[FatesCouncilSystem] The Fates have spoken. Executing ${decision.plotAssignments.length} plot assignments...`);

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

    console.log(`[FatesCouncilSystem] Council Summary: ${decision.summary}`);
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

    // Get or create PlotLines component
    let plotLines = entity.getComponent(CT.PlotLines) as PlotLinesComponent | undefined;
    if (!plotLines) {
      plotLines = {
        type: CT.PlotLines,
        version: 2,
        active: [],
        completed: [],
        abandoned: [],
        dream_hints: [],
      };
    }

    // Get soul ID (for souls) or use entity ID
    const soulIdentity = entity.getComponent(CT.SoulIdentity) as SoulIdentityComponent | undefined;
    const thread = entity.getComponent(CT.SilverThread);
    const soulId = (soulIdentity as any)?.soulName || entityId;
    const personalTick = (thread as any)?.head?.personal_tick || tick;

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

    // Add to active plots
    addActivePlot(plotLines, plotInstance);

    // Update component using World API
    if (entity.hasComponent(CT.PlotLines)) {
      world.removeComponent(entityId, CT.PlotLines);
    }
    world.addComponent(entityId, plotLines);

    console.log(`[FatesCouncilSystem] ✨ The Fates weave: ${plotTemplateId} → ${soulId}`);
    console.log(`[FatesCouncilSystem]    Reasoning: ${reasoning}`);
  }

  /**
   * Subscribe to exotic events
   */
  private subscribeToExoticEvents(): void {
    // Subscribe to divinity events
    this.events.onGeneric('divinity:deity_relationship_critical', (data: unknown) => {
      this.trackExoticEvent({
        type: 'deity_relationship_critical',
        entityId: (data as any).agentId,
        description: `Deity relationship reached critical level`,
        tick: (data as any).tick,
        severity: 0.8,
      });
    });

    // Subscribe to multiverse invasion
    this.events.onGeneric('multiverse:invasion_triggered', (data: unknown) => {
      this.trackExoticEvent({
        type: 'multiverse_invasion',
        entityId: 'universe',  // Affects whole universe
        description: `Invasion from ${(data as any).invaderUniverse}`,
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

  protected onCleanup(): void {
    this.recentExoticEvents = [];
    console.log('[FatesCouncilSystem] The Fates withdraw their gaze');
  }
}
