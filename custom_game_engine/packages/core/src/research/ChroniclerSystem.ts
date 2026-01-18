/**
 * Chronicler System
 *
 * Village historians who record events, births, deaths, discoveries, and the
 * occasional apocalypse. Using whatever writing technology is available.
 *
 * "History is written by the victors. In a village with no wars,
 * history is written by whoever can hold a quill steady."
 *   - The Archivist's Lament
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import {
  getPublicationSystem,
  type PublicationSystem,
  type ChroniclePublication,
  WritingTechLevel,
  getWritingTechName,
} from './PublicationSystem.js';

// ============================================================================
// HISTORICAL EVENT TYPES
// ============================================================================

/**
 * Types of events worth chronicling
 */
export type HistoricalEventType =
  | 'birth'
  | 'death'
  | 'marriage'
  | 'discovery'
  | 'construction'
  | 'disaster'
  | 'celebration'
  | 'arrival'
  | 'departure'
  | 'invention'
  | 'war'
  | 'peace'
  | 'divine_intervention'
  | 'strange_occurrence'
  | 'political'
  | 'economic';

/**
 * A historical event to be recorded
 */
export interface HistoricalEvent {
  /** Event ID */
  id: string;
  /** Type of event */
  type: HistoricalEventType;
  /** When it happened (tick) */
  tick: number;
  /** Brief description */
  description: string;
  /** Detailed description (may be embellished by chronicler) */
  details?: string;
  /** Significance level */
  significance: 'minor' | 'notable' | 'major' | 'legendary';
  /** People involved */
  participants: Array<{ id: string; name: string; role: string }>;
  /** Location if relevant */
  location?: { x: number; y: number; name?: string };
  /** Whether this has been recorded */
  recorded: boolean;
  /** Publication ID if recorded */
  publicationId?: string;
}

// ============================================================================
// CHRONICLER COMPONENT
// ============================================================================

/**
 * Component for agents who serve as chroniclers
 */
export interface ChroniclerComponent {
  type: 'chronicler';
  version: number;
  /** Chronicle volumes authored */
  volumesWritten: number;
  /** Total events recorded */
  eventsRecorded: number;
  /** Years of service */
  yearsAsChronicler: number;
  /** Writing style */
  style: 'factual' | 'dramatic' | 'poetic' | 'sardonic';
  /** Focus areas */
  specializations: HistoricalEventType[];
  /** Current chronicle being written */
  currentChronicle?: {
    title: string;
    startTick: number;
    events: HistoricalEvent[];
  };
  /** Influence as historian */
  historicalInfluence: number;
}

// ============================================================================
// HUMOROUS CHRONICLE GENERATORS
// ============================================================================

/**
 * Chronicle opening lines (Pratchett/Adams/Gaiman style)
 */
// Reserved for future use when generating chronicle content (exported for extensibility)
export const CHRONICLE_OPENINGS: Record<WritingTechLevel, string[]> = {
  [WritingTechLevel.OralTradition]: [
    'Gather round, for I shall tell you what happened in the time of {period}.',
    'In the old days, when {period} was happening, the elders remember...',
    'They say—and who is "they," we no longer recall—that during {period}...',
  ],
  [WritingTechLevel.Pictographic]: [
    '[Drawings indicate: {period}. Many strange things. The artist was clearly stressed.]',
    '☀️⬇️ Moon up. Moon down. Repeat {period} times. Things happened:',
    '🏠👥➡️ This is what occurred when the sun crossed the sky {period} times:',
  ],
  [WritingTechLevel.Scrolls]: [
    'Let it be known to all who unroll this scroll that during {period}, the following transpired:',
    'In the {period} of our settlement, these events of note did occur, as witnessed by those present.',
    'Herein are recorded the happenings of {period}, for the edification of future generations, assuming there are any.',
  ],
  [WritingTechLevel.Books]: [
    'CHAPTER THE FIRST: {period}, or, How We Somehow Survived Another Year',
    'Concerning the events of {period}, collected and arranged by the undersigned, with minimal embellishment (probably).',
    'The definitive account of {period}, as accurate as memory and surviving witnesses allow.',
  ],
  [WritingTechLevel.Printing]: [
    'THE VILLAGE CHRONICLE, Vol. {volume}: {period} Edition',
    'A COMPLETE HISTORY of {period}, Printed for the Benefit of the Public',
    'THE TIMES AND TRIALS of {period}: A Historical Retrospective',
  ],
  [WritingTechLevel.Digital]: [
    '# {period}: A Thread 🧵 (1/42)',
    'BREAKING: Historical analysis of {period} just dropped 👇',
    'Everything you need to know about {period} | Last updated: just now',
  ],
};

/**
 * Event description templates by type (humorous)
 */
// Reserved for future use when generating event descriptions (exported for extensibility)
export const EVENT_DESCRIPTIONS: Record<HistoricalEventType, string[]> = {
  birth: [
    '{name} arrived in the world, surprising everyone including their parents.',
    'A new villager, {name}, was born. The village population increases, as does the noise level.',
    '{name} entered the world with the traditional screaming. All quite normal.',
  ],
  death: [
    '{name} departed this mortal coil. They will be remembered for {deed}.',
    '{name} has ceased to be. The village is diminished.',
    '{name} passed on, leaving behind {legacy}.',
  ],
  marriage: [
    '{name1} and {name2} decided to share their remaining time together. Witnesses report happiness.',
    'The union of {name1} and {name2} was celebrated. May they argue productively.',
    '{name1} and {name2} were joined in partnership, for better or worse (usually both).',
  ],
  discovery: [
    '{name} discovered {thing}. The implications are still being understood.',
    'A discovery of note: {name} found {thing}. Science advances, cautiously.',
    '{thing} was discovered by {name}, who seemed as surprised as everyone else.',
  ],
  construction: [
    'The {building} was completed. It even has walls and everything.',
    'A new {building} now stands where before there was only ambition.',
    'Construction of the {building} finished. Only minor injuries reported.',
  ],
  disaster: [
    'The Great {disaster} occurred. We do not speak of it. (But I shall write of it.)',
    'Calamity struck in the form of {disaster}. The village survived. Mostly.',
    '{disaster} reminded us all of our mortality. Several buildings were also reminded.',
  ],
  celebration: [
    'The Festival of {festival} brought joy, hangovers, and suspicious food.',
    'The village celebrated {festival}. Productivity dropped accordingly.',
    'A great {festival} was held. Memories were made, then forgotten, then made again.',
  ],
  arrival: [
    '{name} arrived from {origin}. They seem harmless, which means nothing.',
    'A newcomer: {name} from {origin}. The village grows more interesting.',
    '{name} came to us from {origin}, seeking a new life. We gave them chores.',
  ],
  departure: [
    '{name} left for {destination}. We wish them well. Mostly.',
    'The departure of {name} for {destination} was noted. The {thing} they owed us was not.',
    '{name} set out for {destination}. The village is quieter now.',
  ],
  invention: [
    '{name} invented {invention}. It only exploded twice during testing.',
    'The {invention} was created by {name}. A new era begins, probably.',
    '{name}\'s {invention} works. Against all expectations, it actually works.',
  ],
  war: [
    'Conflict arose. {name} was involved. We prefer not to discuss the details.',
    'The {conflict} began. It was messy. All conflicts are.',
    'War came to the village. War is never the answer, but sometimes it shows up anyway.',
  ],
  peace: [
    'Peace was restored. The village sighed with relief.',
    'The {conflict} ended. Time to rebuild, again.',
    'After the troubles, peace returned. We appreciate it more now.',
  ],
  divine_intervention: [
    'The gods intervened. Their reasons are, as always, opaque.',
    'Something divine occurred. {effect}. We do not question. Much.',
    'A miracle, or something like it: {effect}. The faithful were validated.',
  ],
  strange_occurrence: [
    'Something strange happened. {description}. No one can explain it.',
    'The inexplicable occurred: {description}. We added it to the list.',
    '{description}. This is why we keep records.',
  ],
  political: [
    '{name} was appointed to {position}. May the odds be ever in their favor.',
    'The village council decided {decision}. Not everyone agreed. No one ever does.',
    'Political changes occurred. {name} now has {responsibility}. Good luck to them.',
  ],
  economic: [
    'The economy did {thing}. Merchants are {reaction}.',
    'Trade {direction}. The village {response}.',
    'Economic news: {news}. Everyone pretends to understand.',
  ],
};

/**
 * Chronicle closing lines
 */
// Reserved for future use when generating chronicle closings (exported for extensibility)
export const CHRONICLE_CLOSINGS: string[] = [
  'And so ends this account. May those who follow find our struggles instructive, or at least entertaining.',
  'Here concludes the chronicle of this period. The future remains, as always, unwritten.',
  'Thus it was recorded. Thus, hopefully, it shall be remembered.',
  'The quill rests. The ink dries. History continues.',
  'This chronicle is complete. The next one will contain the events we haven\'t caused yet.',
  'Written in the hope that someone, someday, will care. No pressure.',
];

// ============================================================================
// CHRONICLER SYSTEM
// ============================================================================

/**
 * Chronicler System
 * Manages village historians and historical record-keeping
 */
export class ChroniclerSystem extends BaseSystem {
  public readonly id: SystemId = 'chronicler';
  public readonly priority: number = 177; // After research systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = 200; // Every 10 seconds at 20 TPS

  private publicationSystem: PublicationSystem | null = null;

  // Event collection
  private pendingEvents: HistoricalEvent[] = [];
  private recordedEvents: Map<string, HistoricalEvent> = new Map();

  // Chronicle management
  private currentChronicleStart: number = 0;
  private chronicleVolume: number = 1;
  private static readonly CHRONICLE_PERIOD = 12000; // ~10 minutes per chronicle volume

  protected async onInitialize(world: World, eventBus: EventBus): Promise<void> {
    this.setupEventListeners();
  }

  /**
   * Initialize the publication system
   */
  private ensurePublicationSystem(): PublicationSystem {
    if (!this.publicationSystem) {
      this.publicationSystem = getPublicationSystem();
    }
    return this.publicationSystem;
  }

  /**
   * Set up listeners for notable events
   */
  private setupEventListeners(): void {
    // Listen for various game events and convert them to historical events
    // This is a framework - actual event types depend on the game's EventMap

    const recordableEvents: Array<{
      eventType: string;
      histType: HistoricalEventType;
      significance: HistoricalEvent['significance'];
      extractor: (data: any) => Partial<HistoricalEvent>;
    }> = [
      {
        eventType: 'agent:died',
        histType: 'death',
        significance: 'notable',
        extractor: (data: any) => ({
          description: `${data.name ?? 'Someone'} passed away`,
          participants: [{ id: data.agentId, name: data.name ?? 'Unknown', role: 'deceased' }],
        }),
      },
      {
        eventType: 'building:completed',
        histType: 'construction',
        significance: 'minor',
        extractor: (data: any) => ({
          description: `Construction of ${data.buildingType ?? 'a building'} was completed`,
          participants: [],
          location: data.position,
        }),
      },
      {
        eventType: 'research:completed',
        histType: 'discovery',
        significance: 'major',
        extractor: (data: any) => ({
          description: `The research "${data.researchName ?? data.researchId}" was completed`,
          participants: data.leadResearcherId
            ? [{ id: data.leadResearcherId, name: 'Lead Researcher', role: 'researcher' }]
            : [],
        }),
      },
      {
        eventType: 'paper:published',
        histType: 'discovery',
        significance: 'notable',
        extractor: (data: any) => ({
          description: `A paper titled "${data.title}" was published`,
          participants: [{ id: data.firstAuthor?.id, name: data.firstAuthor?.name, role: 'author' }],
        }),
      },
    ];

    for (const config of recordableEvents) {
      this.events.onGeneric(config.eventType, (data: unknown) => {
        const extracted = config.extractor(data);
        this.recordEvent({
          id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: config.histType,
          tick: Date.now(),
          description: extracted.description ?? 'Something happened',
          significance: config.significance,
          participants: extracted.participants ?? [],
          location: extracted.location,
          recorded: false,
        });
      });
    }
  }

  /**
   * Record a historical event
   */
  public recordEvent(event: HistoricalEvent): void {
    this.pendingEvents.push(event);
  }

  /**
   * Create a new chronicle publication
   */
  public publishChronicle(
    chronicler: { id: string; name: string },
    events: HistoricalEvent[],
    period: { from: number; to: number },
    villageName: string = 'the village'
  ): ChroniclePublication {
    const pubSystem = this.ensurePublicationSystem();
    const techLevel = pubSystem.getManager().getTechLevel();

    // Sort events by tick and filter to significant ones
    const sortedEvents = events
      .sort((a, b) => a.tick - b.tick)
      .filter((e) => e.significance !== 'minor' || Math.random() > 0.7);

    // Extract notable figures
    const figureMap = new Map<string, { id: string; name: string; role: string }>();
    for (const event of sortedEvents) {
      for (const participant of event.participants) {
        if (!figureMap.has(participant.id)) {
          figureMap.set(participant.id, participant);
        }
      }
    }

    // Format events for chronicle
    const chronicleEvents = sortedEvents.map((e) => ({
      tick: e.tick,
      description: e.description,
      significance: e.significance,
    }));

    // Publish through the publication system
    const publication = pubSystem.publishChronicle(
      chronicler,
      period,
      chronicleEvents,
      Array.from(figureMap.values()),
      { villageName }
    );

    // Mark events as recorded
    for (const event of events) {
      event.recorded = true;
      event.publicationId = publication.id;
      this.recordedEvents.set(event.id, event);
    }

    // Emit publication event
    this.events.emitGeneric('publication:created', {
      publicationId: publication.id,
      type: publication.type,
      category: 'history',
      authorId: chronicler.id,
      authorName: chronicler.name,
      title: publication.title,
      eventCount: chronicleEvents.length,
      period,
      techLevel: getWritingTechName(techLevel),
    });

    return publication;
  }

  /**
   * Get an appointed chronicler from the world
   */
  private findChronicler(world: World): Entity | null {
    // Find an agent with chronicler component or high relevant skills
    const agents = world
      .query()
      .with(ComponentType.Agent)
      .executeEntities();

    for (const agent of agents) {
      // Check for chronicler component
      const chroniclerComp = agent.getComponent<ChroniclerComponent>('chronicler');
      if (chroniclerComp) {
        return agent;
      }

      // Otherwise, look for agents with high wisdom or relevant skills
      // This is a fallback - ideally the village appoints a chronicler
    }

    // Return first agent as fallback (someone has to write history)
    return agents[0] ?? null;
  }

  /**
   * Main update loop
   */
  protected onUpdate(ctx: SystemContext): void {
    // Initialize chronicle period
    if (this.currentChronicleStart === 0) {
      this.currentChronicleStart = ctx.tick;
    }

    // Check if it's time to publish a chronicle
    if (ctx.tick - this.currentChronicleStart >= ChroniclerSystem.CHRONICLE_PERIOD) {
      // Only publish if there are notable events
      const notableEvents = this.pendingEvents.filter(
        (e) => e.significance !== 'minor'
      );

      if (notableEvents.length >= 3) {
        const chronicler = this.findChronicler(ctx.world);
        if (chronicler) {
          const agentComp = chronicler.getComponent<AgentComponent>(ComponentType.Agent);
          this.publishChronicle(
            {
              id: chronicler.id,
              name: agentComp?.name ?? 'Village Chronicler',
            },
            this.pendingEvents,
            { from: this.currentChronicleStart, to: ctx.tick }
          );
        }
      }

      // Start new chronicle period
      this.currentChronicleStart = ctx.tick;
      this.pendingEvents = [];
      this.chronicleVolume++;
    }
  }

  /**
   * Get all recorded events
   */
  public getRecordedEvents(): HistoricalEvent[] {
    return Array.from(this.recordedEvents.values());
  }

  /**
   * Get events by type
   */
  public getEventsByType(type: HistoricalEventType): HistoricalEvent[] {
    return Array.from(this.recordedEvents.values()).filter((e) => e.type === type);
  }

  /**
   * Get current chronicle volume
   */
  public getCurrentVolume(): number {
    return this.chronicleVolume;
  }

  /**
   * Get pending event count
   */
  public getPendingEventCount(): number {
    return this.pendingEvents.length;
  }

  /**
   * Cleanup subscriptions
   */
  protected onCleanup(): void {
    // Base class handles events.cleanup()
  }
}

// Singleton instance
let chroniclerSystemInstance: ChroniclerSystem | null = null;

/**
 * Get the singleton ChroniclerSystem instance
 */
export function getChroniclerSystem(): ChroniclerSystem {
  if (!chroniclerSystemInstance) {
    chroniclerSystemInstance = new ChroniclerSystem();
  }
  return chroniclerSystemInstance;
}

/**
 * Reset the system (for testing)
 */
export function resetChroniclerSystem(): void {
  chroniclerSystemInstance = null;
}
