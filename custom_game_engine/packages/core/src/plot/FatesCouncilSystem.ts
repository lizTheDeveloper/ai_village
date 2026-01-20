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
  private async conductFatesCouncil(world: World, tick: number, dayNumber: number): Promise<void> {
    console.log(`[FatesCouncilSystem] Evening falls. The Three Fates convene... (Day ${dayNumber})`);

    // Gather narrative context
    const context = this.gatherNarrativeContext(world, dayNumber);

    // Skip council if nothing interesting is happening
    if (context.potentialHooks.length === 0 && context.worldTension < 0.3) {
      console.log('[FatesCouncilSystem] The tapestry is peaceful. The Fates observe in silence.');
      return;
    }

    console.log(`[FatesCouncilSystem] ${context.allThreads.length} threads examined, ${context.potentialHooks.length} story hooks found`);

    // Generate Fates council prompt
    const prompt = this.generateCouncilPrompt(context);

    // Queue LLM request (will process async)
    // TODO: Integrate with actual LLMDecisionQueue
    // For now, log the prompt
    console.log('[FatesCouncilSystem] Council prompt generated:', prompt.substring(0, 200) + '...');

    // In production, this would be:
    // this.llmQueue.queueFatesCouncil({
    //   prompt,
    //   tick,
    //   onComplete: (decision) => this.executeFatesDecisions(decision, world, tick)
    // });
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
    const thread = soul.getComponent(CT.SilverThread) as SilverThreadComponent | undefined;

    if (!soulIdentity || !plotLines) return null;

    // Gather active plots
    const activePlotIds = plotLines.active.map(p => p.instance_id);

    // Assess if needs challenge
    const hasRecentPlot = plotLines.active.some(p =>
      (thread?.head.personal_tick ?? 0) - p.assigned_at_personal_tick < 10000
    );
    const needsChallenge = !hasRecentPlot && soulIdentity.wisdom_level > 20;

    // Check if overwhelmed
    const overwhelmed = plotLines.active.length > 5;

    // Calculate story potential based on current situation
    const storyPotential = this.assessStoryPotential(soul, world);

    // Build context summary
    const context = this.buildEntityContext(soul, world);

    return {
      entityId: soul.id,
      entityType: 'soul',
      name: soulIdentity.true_name || soul.id,
      activePlots: activePlotIds,
      completedPlots: plotLines.completed.length,
      wisdom: soulIdentity.wisdom_level,
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
      name: deityComp.identity?.primaryName || deity.id,
      activePlots: plotLines?.active.map(p => p.instance_id) || [],
      completedPlots: plotLines?.completed.length || 0,
      wisdom: deityComp.divinePower || 100,  // Use divine power as "wisdom"
      recentActions: [],  // TODO: deity activities
      storyPotential: 0.5,  // Deities always have potential
      needsChallenge: false,
      overwhelmed: false,
      context: `Deity of ${deityComp.domain || 'unknown domain'}`,
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
        type: 'plot_lines',
        active: [],
        completed: [],
        abandoned: [],
      };
    }

    // Get soul ID (for souls) or use entity ID
    const soulIdentity = entity.getComponent(CT.SoulIdentity) as SoulIdentityComponent | undefined;
    const thread = entity.getComponent(CT.SilverThread) as SilverThreadComponent | undefined;
    const soulId = soulIdentity?.true_name || entityId;
    const personalTick = thread?.head.personal_tick || tick;

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
