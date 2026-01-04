/**
 * EventReportingSystem - Detects world events and dispatches reporters
 *
 * Bridges the gap between world events and news coverage by:
 * 1. Listening to EventBus for newsworthy events
 * 2. Creating NewsStory objects from events
 * 3. Auto-assigning newspaper reporters to investigate
 * 4. Auto-dispatching TV field reporters to scenes
 * 5. Triggering reporter navigation to event locations
 *
 * This makes news reporting REACTIVE and EVENT-DRIVEN instead of random.
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { System } from '../ecs/System.js';
import type { EventBus, GameEvent } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { getNewsroomSystem } from '../television/formats/NewsroomSystem.js';
import type { NewsStory, NewsCategory, NewsPriority, FieldReporter, NewsDesk } from '../television/formats/NewsroomSystem.js';
import { createRecordingComponent } from '../components/RecordingComponent.js';
import type { RecordingCategory } from '../components/RecordingComponent.js';
import type { EntityImpl } from '../ecs/Entity.js';

/**
 * Event newsworthiness scoring.
 */
interface EventScore {
  category: NewsCategory;
  priority: NewsPriority;
  headline: string;
  summary: string;
  sendReporter: boolean;  // Should we dispatch a field reporter?
  recordingType?: RecordingCategory;
}

/**
 * EventReportingSystem - Converts world events into news stories.
 */
export class EventReportingSystem implements System {
  readonly id = 'EventReportingSystem';
  readonly priority = 75;  // After NewsroomSystem (70)
  readonly requiredComponents = [] as const;

  private eventBus: EventBus | null = null;
  private eventListeners: Array<() => void> = [];

  /** Track recent events to avoid duplicates */
  private recentEventIds = new Set<string>();
  private readonly MAX_RECENT_EVENTS = 100;

  /** Update interval (check for reporter assignments every 60 ticks = 3 seconds) */
  private static readonly UPDATE_INTERVAL = 60;
  private lastUpdateTick = 0;

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  /**
   * Subscribe to newsworthy world events.
   */
  private setupEventListeners(): void {
    if (!this.eventBus) return;

    // Agent events
    this.subscribeToEvent('agent:died', (event) => this.handleAgentDeath(event));
    this.subscribeToEvent('agent:born', (event) => this.handleAgentBirth(event));
    this.subscribeToEvent('union:formed', (event) => this.handleUnionFormed(event));

    // Combat events
    this.subscribeToEvent('combat:battle_started', (event) => this.handleBattleStarted(event));
    this.subscribeToEvent('combat:battle_ended', (event) => this.handleBattleEnded(event));

    // Building events
    this.subscribeToEvent('building:completed', (event) => this.handleBuildingCompleted(event));
    this.subscribeToEvent('building:destroyed', (event) => this.handleBuildingDestroyed(event));

    // Crisis events
    this.subscribeToEvent('disaster:occurred', (event) => this.handleDisaster(event));
    this.subscribeToEvent('invasion:started', (event) => this.handleInvasion(event));

    // Cultural events
    this.subscribeToEvent('festival:started', (event) => this.handleFestival(event));
    this.subscribeToEvent('sacred_site:named', (event) => this.handleSacredSite(event));

    // Divine events
    this.subscribeToEvent('divine:intervention', (event) => this.handleDivineIntervention(event));
  }

  /**
   * Helper to subscribe to an event type.
   */
  private subscribeToEvent(eventType: string, handler: (event: GameEvent) => void): void {
    if (!this.eventBus) return;

    const unsubscribe = this.eventBus.subscribe(eventType as any, handler);
    this.eventListeners.push(unsubscribe);
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleAgentDeath(event: GameEvent): void {
    const data = event.data as any;
    const agentId = data.agentId ?? data.entityId;
    const agentName = data.agentName ?? data.name ?? 'Unknown';
    const cause = data.cause ?? 'unknown causes';
    const location = data.location ?? { x: 0, y: 0 };

    const score: EventScore = {
      category: 'crime',
      priority: 'high',
      headline: `${agentName} Dies ${cause === 'unknown causes' ? '' : `from ${cause}`}`,
      summary: `The community mourns the loss of ${agentName}, who died ${cause === 'unknown causes' ? 'unexpectedly' : `from ${cause}`}.`,
      sendReporter: true,
      recordingType: 'event_coverage',
    };

    this.createNewsStory(score, agentId, location, event.tick);
  }

  private handleAgentBirth(event: GameEvent): void {
    const data = event.data as any;
    const agentName = data.name ?? 'a new citizen';
    const parentNames = data.parentNames ?? [];
    const location = data.location ?? { x: 0, y: 0 };

    const parentStr = parentNames.length > 0 ? ` to ${parentNames.join(' and ')}` : '';

    const score: EventScore = {
      category: 'human_interest',
      priority: 'low',
      headline: `New Arrival: ${agentName} Born${parentStr}`,
      summary: `The community welcomes ${agentName}${parentStr}.`,
      sendReporter: false,  // Don't send reporter to births
    };

    this.createNewsStory(score, data.agentId, location, event.tick);
  }

  private handleUnionFormed(event: GameEvent): void {
    const data = event.data as any;
    const agent1Name = data.agent1Name ?? 'someone';
    const agent2Name = data.agent2Name ?? 'someone';
    const location = data.location ?? { x: 0, y: 0 };

    const score: EventScore = {
      category: 'human_interest',
      priority: 'medium',
      headline: `${agent1Name} and ${agent2Name} Wed`,
      summary: `${agent1Name} and ${agent2Name} were married in a beautiful ceremony.`,
      sendReporter: false,  // Maybe send photographer, but not field reporter
    };

    this.createNewsStory(score, data.agent1Id, location, event.tick);
  }

  private handleBattleStarted(event: GameEvent): void {
    const data = event.data as any;
    const location = data.location ?? { x: 0, y: 0 };
    const participants = data.participants ?? 0;

    const score: EventScore = {
      category: 'breaking',
      priority: 'critical',
      headline: `BREAKING: Battle Erupts${location ? ' in City Center' : ''}`,
      summary: `A violent confrontation involving ${participants} combatants has broken out. Residents urged to stay indoors.`,
      sendReporter: true,  // CRITICAL - send reporter immediately
      recordingType: 'event_coverage',
    };

    this.createNewsStory(score, data.battleId, location, event.tick);
  }

  private handleBattleEnded(event: GameEvent): void {
    const data = event.data as any;
    const casualties = data.casualties ?? 0;
    const location = data.location ?? { x: 0, y: 0 };

    const score: EventScore = {
      category: 'breaking',
      priority: 'high',
      headline: `Battle Ends: ${casualties} Casualties Reported`,
      summary: `The fighting has ceased with ${casualties} casualties. Emergency services on scene.`,
      sendReporter: true,
      recordingType: 'event_coverage',
    };

    this.createNewsStory(score, data.battleId, location, event.tick);
  }

  private handleBuildingCompleted(event: GameEvent): void {
    const data = event.data as any;
    const buildingType = data.buildingType ?? 'building';
    const location = data.location ?? { x: 0, y: 0 };

    const score: EventScore = {
      category: 'local',
      priority: 'medium',
      headline: `New ${buildingType} Opens in Town`,
      summary: `Construction completed on the new ${buildingType}, adding to the city's growing infrastructure.`,
      sendReporter: false,  // Not urgent
    };

    this.createNewsStory(score, data.buildingId, location, event.tick);
  }

  private handleBuildingDestroyed(event: GameEvent): void {
    const data = event.data as any;
    const buildingType = data.buildingType ?? 'building';
    const cause = data.cause ?? 'unknown';
    const location = data.location ?? { x: 0, y: 0 };

    const score: EventScore = {
      category: 'breaking',
      priority: 'high',
      headline: `${buildingType} Destroyed by ${cause}`,
      summary: `A ${buildingType} was destroyed today${cause !== 'unknown' ? ` by ${cause}` : ''}. Investigation underway.`,
      sendReporter: true,
      recordingType: 'event_coverage',
    };

    this.createNewsStory(score, data.buildingId, location, event.tick);
  }

  private handleDisaster(event: GameEvent): void {
    const data = event.data as any;
    const disasterType = data.type ?? 'disaster';
    const severity = data.severity ?? 'moderate';
    const location = data.location ?? { x: 0, y: 0 };

    const priority = severity === 'catastrophic' ? 'critical' : severity === 'severe' ? 'high' : 'medium';

    const score: EventScore = {
      category: 'breaking',
      priority: priority as NewsPriority,
      headline: `${severity.toUpperCase()}: ${disasterType} Strikes City`,
      summary: `A ${severity} ${disasterType} has struck the area. Emergency response teams deployed.`,
      sendReporter: true,
      recordingType: 'event_coverage',
    };

    this.createNewsStory(score, data.disasterId, location, event.tick);
  }

  private handleInvasion(event: GameEvent): void {
    const data = event.data as any;
    const invaderType = data.invaderType ?? 'hostile forces';
    const location = data.location ?? { x: 0, y: 0 };

    const score: EventScore = {
      category: 'breaking',
      priority: 'critical',
      headline: `BREAKING: ${invaderType} Invade City`,
      summary: `${invaderType} have been spotted near the city. All residents urged to seek shelter immediately.`,
      sendReporter: true,  // CRITICAL
      recordingType: 'event_coverage',
    };

    this.createNewsStory(score, data.invasionId, location, event.tick);
  }

  private handleFestival(event: GameEvent): void {
    const data = event.data as any;
    const festivalName = data.name ?? 'Community Festival';
    const location = data.location ?? { x: 0, y: 0 };

    const score: EventScore = {
      category: 'entertainment',
      priority: 'medium',
      headline: `${festivalName} Begins Today`,
      summary: `The annual ${festivalName} kicks off with celebrations throughout the city.`,
      sendReporter: false,  // Entertainment, not urgent
    };

    this.createNewsStory(score, data.festivalId, location, event.tick);
  }

  private handleSacredSite(event: GameEvent): void {
    const data = event.data as any;
    const siteName = data.name ?? 'Sacred Site';
    const location = data.location ?? { x: 0, y: 0 };

    const score: EventScore = {
      category: 'human_interest',
      priority: 'high',
      headline: `New Sacred Site: ${siteName}`,
      summary: `Community members have designated a new sacred site known as ${siteName}.`,
      sendReporter: true,  // Cultural significance
      recordingType: 'documentary',
    };

    this.createNewsStory(score, data.siteId, location, event.tick);
  }

  private handleDivineIntervention(event: GameEvent): void {
    const data = event.data as any;
    const deity = data.deityName ?? 'divine forces';
    const effect = data.effect ?? 'mysterious occurrence';
    const location = data.location ?? { x: 0, y: 0 };

    const score: EventScore = {
      category: 'breaking',
      priority: 'critical',
      headline: `BREAKING: Divine Intervention by ${deity}`,
      summary: `Witnesses report ${effect} attributed to ${deity}. Crowds gathering at the scene.`,
      sendReporter: true,
      recordingType: 'event_coverage',
    };

    this.createNewsStory(score, data.interventionId, location, event.tick);
  }

  // ============================================================================
  // STORY CREATION & REPORTER DISPATCH
  // ============================================================================

  /**
   * Create a news story and optionally dispatch reporters.
   */
  private createNewsStory(
    score: EventScore,
    sourceEntityId: string,
    location: { x: number; y: number },
    currentTick: number
  ): void {
    // Avoid duplicate stories
    const eventId = `${score.headline}_${currentTick}`;
    if (this.recentEventIds.has(eventId)) {
      return;
    }

    this.recentEventIds.add(eventId);
    if (this.recentEventIds.size > this.MAX_RECENT_EVENTS) {
      const firstId = this.recentEventIds.values().next().value as string;
      this.recentEventIds.delete(firstId);
    }

    // Submit story to newsroom
    const newsroomSystem = getNewsroomSystem();
    const deskManager = newsroomSystem.getDeskManager();

    const story = deskManager.submitStory({
      headline: score.headline,
      summary: score.summary,
      category: score.category,
      priority: score.priority,
      sourceEntityId,
      location,
      discoveredTick: currentTick,
    });

    // If critical/high priority and should send reporter, dispatch field reporter
    if (score.sendReporter && (score.priority === 'critical' || score.priority === 'high')) {
      this.dispatchFieldReporter(story, location, score.recordingType);
    }
  }

  /**
   * Dispatch a field reporter to cover a story.
   */
  private dispatchFieldReporter(
    story: NewsStory,
    location: { x: number; y: number },
    _recordingType?: RecordingCategory
  ): void {
    const newsroomSystem = getNewsroomSystem();
    const deskManager = newsroomSystem.getDeskManager();

    // Find all news desks
    const desks = Array.from((deskManager as any).desks.values()) as NewsDesk[];

    for (const desk of desks) {
      // Find available field reporter
      const reporter = desk.fieldReporters.find((r: FieldReporter) => r.status === 'available');

      if (reporter) {
        // Dispatch reporter to story
        deskManager.dispatchReporter(desk.id, reporter.agentId, story.id);

        // Mark reporter's destination
        story.location = location;

        console.log(`[EventReporting] Dispatched ${reporter.name} to cover: ${story.headline}`);
        break;
      }
    }
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    // Throttle updates
    if (currentTick - this.lastUpdateTick < EventReportingSystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // Check for reporters that should be navigating to stories
    this.updateReporterNavigation(world, currentTick);
  }

  /**
   * Update reporter navigation to story locations.
   */
  private updateReporterNavigation(world: World, currentTick: number): void {
    const newsroomSystem = getNewsroomSystem();
    const deskManager = newsroomSystem.getDeskManager();

    const desks = Array.from((deskManager as any).desks.values()) as NewsDesk[];

    for (const desk of desks) {
      for (const reporter of desk.fieldReporters) {
        if (reporter.status !== 'en_route' && reporter.status !== 'on_scene') {
          continue;
        }

        const entity = world.getEntity(reporter.agentId) as EntityImpl | null;
        if (!entity) continue;

        // Get assigned story
        const story = desk.storyQueue.find((s: NewsStory) => s.id === reporter.assignedStoryId);
        if (!story || !story.location) continue;

        const position = entity.getComponent(CT.Position) as any;
        if (!position) continue;

        // Check if reporter arrived at location
        const dx = position.x - story.location.x;
        const dy = position.y - story.location.y;
        const distSq = dx * dx + dy * dy;
        const ARRIVAL_DISTANCE_SQ = 100 * 100; // Within 100 units

        if (distSq < ARRIVAL_DISTANCE_SQ && reporter.status === 'en_route') {
          // Reporter arrived!
          deskManager.reporterArrived(desk.id, reporter.agentId);
          reporter.location = story.location;

          // Start recording
          this.startRecording(world, entity, story, currentTick);

          console.log(`[EventReporting] ${reporter.name} arrived at scene: ${story.headline}`);
        }

        // Start live report after arrival
        if (reporter.status === 'on_scene') {
          deskManager.startLiveReport(desk.id, reporter.agentId);
        }
      }
    }
  }

  /**
   * Start a recording for a reporter at a scene.
   */
  private startRecording(
    world: World,
    reporterEntity: EntityImpl,
    story: NewsStory,
    currentTick: number
  ): void {
    const agentComp = reporterEntity.getComponent(CT.Agent) as any;
    const position = reporterEntity.getComponent(CT.Position) as any;

    if (!agentComp || !position) return;

    // Create recording entity
    const recordingEntity = world.createEntity();
    const recording = createRecordingComponent(
      'video',
      'event_coverage',
      reporterEntity.id,
      agentComp.name ?? 'Reporter',
      { x: position.x, y: position.y },
      currentTick,
      {
        associatedStoryId: story.id,
        description: `Coverage of: ${story.headline}`,
        equipmentQuality: 1.0,  // TODO: Based on equipment
      }
    );

    (recordingEntity as any).addComponent(recording);

    console.log(`[EventReporting] ${agentComp.name} started recording: ${story.headline}`);
  }

  cleanup(): void {
    // Unsubscribe from all events
    for (const unsubscribe of this.eventListeners) {
      unsubscribe();
    }
    this.eventListeners = [];
    this.eventBus = null;
    this.recentEventIds.clear();
  }
}
