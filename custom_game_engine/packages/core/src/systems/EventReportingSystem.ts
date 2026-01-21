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
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { EventBus, GameEvent } from '../events/EventBus.js';
import type { EventType } from '../events/EventMap.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { getNewsroomSystem } from '../television/formats/NewsroomSystem.js';
import type { NewsStory, NewsCategory, NewsPriority, FieldReporter, NewsDesk } from '../television/formats/NewsroomSystem.js';
import { createRecordingComponent } from '../components/RecordingComponent.js';
import type { RecordingCategory } from '../components/RecordingComponent.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { EquipmentComponent } from '../components/EquipmentComponent.js';
import { getAllEquippedItems } from '../components/EquipmentComponent.js';

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
export class EventReportingSystem extends BaseSystem {
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

  protected onInitialize(_world: World, eventBus: EventBus): void {
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
    this.subscribeToEvent('godcrafted:discovered', (event) => this.handleGodCraftedDiscovery(event));
  }

  /**
   * Helper to subscribe to an event type with proper typing.
   */
  private subscribeToEvent<T extends EventType>(
    eventType: T,
    handler: (event: GameEvent<T>) => void
  ): void {
    if (!this.eventBus) return;

    const unsubscribe = this.eventBus.subscribe(eventType, handler);
    this.eventListeners.push(unsubscribe);
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleAgentDeath(event: GameEvent<'agent:died'>): void {
    const data = event.data;
    const agentId = data.entityId;
    const agentName = data.name;
    const cause = data.causeOfDeath;
    // Note: agent:died event doesn't have location in EventMap, default to origin
    const location = { x: 0, y: 0 };

    const score: EventScore = {
      category: 'crime',
      priority: 'high',
      headline: `${agentName} Dies ${cause === 'unknown' ? '' : `from ${cause}`}`,
      summary: `The community mourns the loss of ${agentName}, who died ${cause === 'unknown' ? 'unexpectedly' : `from ${cause}`}.`,
      sendReporter: true,
      recordingType: 'event_coverage',
    };

    this.createNewsStory(score, agentId, location, event.tick);
  }

  private handleAgentBirth(event: GameEvent<'agent:born'>): void {
    const data = event.data;
    const agentName = data.agentName ?? 'a new citizen';
    const parentIds = data.parentIds ?? [];
    // Note: agent:born event doesn't have location in EventMap, default to origin
    const location = { x: 0, y: 0 };

    // We don't have parent names in the event, just IDs
    const parentStr = parentIds.length > 0 ? ' to loving parents' : '';

    const score: EventScore = {
      category: 'human_interest',
      priority: 'low',
      headline: `New Arrival: ${agentName} Born${parentStr}`,
      summary: `The community welcomes ${agentName}${parentStr}.`,
      sendReporter: false,  // Don't send reporter to births
    };

    this.createNewsStory(score, data.agentId, location, event.tick);
  }

  private handleUnionFormed(event: GameEvent<'union:formed'>): void {
    const data = event.data;
    // Note: union:formed event doesn't have names in EventMap, only IDs
    const agent1Name = 'someone';
    const agent2Name = 'someone else';
    // Note: union:formed event doesn't have location in EventMap, default to origin
    const location = { x: 0, y: 0 };

    const score: EventScore = {
      category: 'human_interest',
      priority: 'medium',
      headline: `${agent1Name} and ${agent2Name} Wed`,
      summary: `${agent1Name} and ${agent2Name} were married in a beautiful ceremony.`,
      sendReporter: false,  // Maybe send photographer, but not field reporter
    };

    this.createNewsStory(score, data.agent1Id, location, event.tick);
  }

  private handleBattleStarted(event: GameEvent<'combat:battle_started'>): void {
    const data = event.data;
    const location = data.location;
    const participantCount = data.participants.length;

    const score: EventScore = {
      category: 'breaking',
      priority: 'critical',
      headline: `BREAKING: Battle Erupts in City Center`,
      summary: `A violent confrontation involving ${participantCount} combatants has broken out. Residents urged to stay indoors.`,
      sendReporter: true,  // CRITICAL - send reporter immediately
      recordingType: 'event_coverage',
    };

    // Use first participant as sourceEntityId
    const sourceEntityId = data.participants[0] ?? 'unknown';
    this.createNewsStory(score, sourceEntityId, location, event.tick);
  }

  private handleBattleEnded(event: GameEvent<'combat:battle_ended'>): void {
    const data = event.data;
    const casualtyCount = data.casualties?.length ?? 0;
    // Note: combat:battle_ended doesn't have location in EventMap, default to origin
    const location = { x: 0, y: 0 };

    const score: EventScore = {
      category: 'breaking',
      priority: 'high',
      headline: `Battle Ends: ${casualtyCount} Casualties Reported`,
      summary: `The fighting has ceased with ${casualtyCount} casualties. Emergency services on scene.`,
      sendReporter: true,
      recordingType: 'event_coverage',
    };

    // Use first participant as sourceEntityId
    const sourceEntityId = data.participants[0] ?? 'unknown';
    this.createNewsStory(score, sourceEntityId, location, event.tick);
  }

  private handleBuildingCompleted(event: GameEvent<'building:completed'>): void {
    const data = event.data;
    const buildingType = data.buildingType;
    const location = data.location;

    const score: EventScore = {
      category: 'local',
      priority: 'medium',
      headline: `New ${buildingType} Opens in Town`,
      summary: `Construction completed on the new ${buildingType}, adding to the city's growing infrastructure.`,
      sendReporter: false,  // Not urgent
    };

    this.createNewsStory(score, data.buildingId, location, event.tick);
  }

  private handleBuildingDestroyed(event: GameEvent<'building:destroyed'>): void {
    const data = event.data;
    // Note: building:destroyed doesn't have buildingType, cause, or location in EventMap
    const buildingType = 'building';
    const cause = 'unknown';
    const location = { x: 0, y: 0 };

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

  private handleDisaster(event: GameEvent<'disaster:occurred'>): void {
    const data = event.data;
    const disasterType = data.disasterType;
    const severity = data.severity;
    const location = data.location;

    const priority = severity > 8 ? 'critical' : severity > 5 ? 'high' : 'medium';

    const severityLabel = severity > 8 ? 'CATASTROPHIC' : severity > 5 ? 'SEVERE' : 'MODERATE';

    const score: EventScore = {
      category: 'breaking',
      priority: priority as NewsPriority,
      headline: `${severityLabel}: ${disasterType} Strikes City`,
      summary: `A ${severityLabel.toLowerCase()} ${disasterType} has struck the area. Emergency response teams deployed.`,
      sendReporter: true,
      recordingType: 'event_coverage',
    };

    // Use location as a string ID since disaster doesn't have a dedicated ID
    const sourceEntityId = `disaster_${disasterType}_${event.tick}`;
    this.createNewsStory(score, sourceEntityId, location, event.tick);
  }

  private handleInvasion(event: GameEvent<'invasion:started'>): void {
    const data = event.data;
    const invaderType = data.invaderType ?? 'hostile forces';
    const location = data.targetLocation;

    const score: EventScore = {
      category: 'breaking',
      priority: 'critical',
      headline: `BREAKING: ${invaderType} Invade City`,
      summary: `${invaderType} have been spotted near the city. All residents urged to seek shelter immediately.`,
      sendReporter: true,  // CRITICAL
      recordingType: 'event_coverage',
    };

    // Use first invader as sourceEntityId
    const sourceEntityId = data.invaderIds[0] ?? 'unknown';
    this.createNewsStory(score, sourceEntityId, location, event.tick);
  }

  private handleFestival(event: GameEvent<'festival:started'>): void {
    const data = event.data;
    const festivalName = data.festivalType;
    const location = data.location;

    const score: EventScore = {
      category: 'entertainment',
      priority: 'medium',
      headline: `${festivalName} Begins Today`,
      summary: `The annual ${festivalName} kicks off with celebrations throughout the city.`,
      sendReporter: false,  // Entertainment, not urgent
    };

    // Use organizer or first participant as sourceEntityId
    const sourceEntityId = data.organizerId ?? data.participants?.[0] ?? 'unknown';
    this.createNewsStory(score, sourceEntityId, location, event.tick);
  }

  private handleSacredSite(event: GameEvent<'sacred_site:named'>): void {
    const data = event.data;
    const siteName = data.name;
    // Note: sacred_site:named doesn't have location in EventMap, default to origin
    const location = { x: 0, y: 0 };

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

  private handleDivineIntervention(event: GameEvent<'divine:intervention'>): void {
    const data = event.data;
    const deity = 'divine forces'; // deityId is in data, but not name
    const effect = data.description ?? data.interventionType;
    // Note: divine:intervention doesn't have location in EventMap, default to origin
    const location = { x: 0, y: 0 };

    const score: EventScore = {
      category: 'breaking',
      priority: 'critical',
      headline: `BREAKING: Divine Intervention by ${deity}`,
      summary: `Witnesses report ${effect} attributed to ${deity}. Crowds gathering at the scene.`,
      sendReporter: true,
      recordingType: 'event_coverage',
    };

    // Use deity or target as sourceEntityId
    const sourceEntityId = data.deityId ?? data.targetId ?? 'divine_intervention';
    this.createNewsStory(score, sourceEntityId, location, event.tick);
  }

  private handleGodCraftedDiscovery(event: GameEvent<'godcrafted:discovered'>): void {
    const data = event.data;
    const contentType = data.contentType;
    const name = data.name;
    const creator = data.creatorName;
    const domain = data.creatorDomain;
    const method = data.discoveryMethod ?? 'unknown means';

    // Create headline based on content type
    const typeLabelMap: Record<string, string> = {
      riddle: 'Ancient Riddle',
      spell: 'Legendary Spell',
      recipe: 'Divine Recipe',
      legendary_item: 'Legendary Artifact',
      soul: 'Ancient Soul',
      quest: 'Divine Quest',
    };
    const typeLabel = typeLabelMap[contentType] || 'Divine Artifact';

    const score: EventScore = {
      category: 'breaking',
      priority: 'high',
      headline: `DISCOVERY: ${typeLabel} "${name}" Found!`,
      summary: `A ${contentType} crafted by ${creator}, God of ${domain}, has been discovered through ${method}. Scholars are investigating its powers and origins.`,
      sendReporter: true,
      recordingType: 'event_coverage',
    };

    this.createNewsStory(score, data.contentId, { x: 0, y: 0 }, event.tick);
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
    const desks = deskManager.getAllDesks();

    for (const desk of desks) {
      // Find available field reporter
      const reporter = desk.fieldReporters.find((r: FieldReporter) => r.status === 'available');

      if (reporter) {
        // Dispatch reporter to story
        deskManager.dispatchReporter(desk.id, reporter.agentId, story.id);

        // Mark reporter's destination
        story.location = location;

        break;
      }
    }
  }

  protected readonly throttleInterval = EventReportingSystem.UPDATE_INTERVAL;

  protected onUpdate(ctx: SystemContext): void {
    // Check for reporters that should be navigating to stories
    this.updateReporterNavigation(ctx.world, ctx.tick);
  }

  /**
   * Update reporter navigation to story locations.
   */
  private updateReporterNavigation(world: World, currentTick: number): void {
    const newsroomSystem = getNewsroomSystem();
    const deskManager = newsroomSystem.getDeskManager();

    // Find all news desks
    const desks = deskManager.getAllDesks();

    // Lazy loading: Skip if no news desks exist
    if (desks.length === 0) {
      return;
    }

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

        const position = entity.getComponent<PositionComponent>(CT.Position);
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

        }

        // Start live report after arrival
        if (reporter.status === 'on_scene') {
          deskManager.startLiveReport(desk.id, reporter.agentId);
        }
      }
    }
  }

  /**
   * Calculate equipment quality based on reporter's gear.
   * Returns multiplier (0.5-1.5) based on equipment quality.
   */
  private calculateEquipmentQuality(reporterEntity: EntityImpl): number {
    const equipment = reporterEntity.getComponent<EquipmentComponent>(CT.Equipment);

    // Base quality without any equipment
    let equipmentQuality = 0.5;

    if (!equipment) {
      return equipmentQuality;
    }

    // Get all equipped items
    const equippedItems = getAllEquippedItems(equipment);

    // Check for recording-related equipment by item ID patterns
    // Note: Since specific recording equipment items may not be defined yet,
    // we'll look for general tool/equipment items and use their quality
    let hasRecordingEquipment = false;
    let totalQualityBonus = 0;
    let equipmentCount = 0;

    for (const item of equippedItems) {
      // Check for potential recording equipment by item ID
      const itemId = item.id.toLowerCase();

      // Camera or recording device
      if (itemId.includes('camera') || itemId.includes('recording') ||
          itemId.includes('video') || itemId.includes('camcorder')) {
        hasRecordingEquipment = true;
        // Camera is the most important piece of equipment
        equipmentQuality += 0.4;
        equipmentCount++;
      }

      // Microphone
      if (itemId.includes('microphone') || itemId.includes('mic') ||
          itemId.includes('audio')) {
        hasRecordingEquipment = true;
        // Microphone provides smaller boost
        equipmentQuality += 0.2;
        equipmentCount++;
      }

      // Lighting equipment
      if (itemId.includes('light') || itemId.includes('lamp') ||
          itemId.includes('flash')) {
        hasRecordingEquipment = true;
        // Lighting provides minor boost
        equipmentQuality += 0.1;
        equipmentCount++;
      }

      // Generic tool quality bonus (if item has quality trait)
      if (item.traits?.tool && equipmentCount > 0) {
        // Tool trait exists - this is professional equipment
        totalQualityBonus += 0.1;
      }
    }

    // Add quality bonus if professional equipment detected
    equipmentQuality += totalQualityBonus;

    // Cap at reasonable maximum (1.5 = 150% quality for premium gear)
    return Math.min(1.5, equipmentQuality);
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
    const identity = reporterEntity.getComponent<IdentityComponent>(CT.Identity);
    const position = reporterEntity.getComponent<PositionComponent>(CT.Position);

    if (!identity || !position) return;

    // Calculate equipment quality based on reporter's gear
    const equipmentQuality = this.calculateEquipmentQuality(reporterEntity);

    // Create recording entity
    const recordingEntity = world.createEntity();
    const recording = createRecordingComponent(
      'video',
      'event_coverage',
      reporterEntity.id,
      identity.name,
      { x: position.x, y: position.y },
      currentTick,
      {
        associatedStoryId: story.id,
        description: `Coverage of: ${story.headline}`,
        equipmentQuality,
      }
    );

    // EntityImpl exposes addComponent method
    (recordingEntity as EntityImpl).addComponent(recording);

  }

  protected onCleanup(): void {
    // Unsubscribe from all events
    for (const unsubscribe of this.eventListeners) {
      unsubscribe();
    }
    this.eventListeners = [];
    this.eventBus = null;
    this.recentEventIds.clear();
  }
}
