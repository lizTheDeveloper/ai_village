/**
 * TalkShowSystem - Interview and variety show management
 *
 * Handles:
 * - Guest booking and scheduling
 * - Interview preparation and topics
 * - Monologue generation
 * - Audience interaction
 * - Musical/performance segments
 */

import type { World } from '../../ecs/World.js';
import type { EventBus } from '../../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../../ecs/SystemContext.js';
import { SystemEventManager } from '../../events/TypedEventEmitter.js';
import { ComponentType } from '../../types/ComponentType.js';

// ============================================================================
// TALK SHOW TYPES
// ============================================================================

export type TalkShowStyle =
  | 'late_night'      // Late night comedy talk show
  | 'morning'         // Morning show format
  | 'daytime'         // Daytime talk (Oprah style)
  | 'interview'       // Pure interview format
  | 'variety'         // Variety show with performances
  | 'panel';          // Panel discussion format

export type SegmentType =
  | 'monologue'       // Opening monologue
  | 'desk_bit'        // Comedy bit at the desk
  | 'interview'       // Guest interview
  | 'performance'     // Musical/comedy performance
  | 'game'            // Game with guest
  | 'audience'        // Audience interaction
  | 'panel'           // Panel discussion
  | 'remote'          // Pre-recorded segment
  | 'closing';        // Closing remarks

export interface TalkShowEpisode {
  id: string;
  showId: string;
  episodeNumber: number;
  airDate: number; // tick

  /** Host(s) for this episode */
  hosts: string[];

  /** Episode theme (if any) */
  theme?: string;

  /** Segments in order */
  segments: TalkShowSegment[];

  /** Current production status */
  status: 'planning' | 'booking' | 'rehearsing' | 'taping' | 'complete';

  /** Audience metrics */
  studioAudienceSize: number;
  audienceEnergyLevel: number; // 0-100
}

export interface TalkShowSegment {
  id: string;
  type: SegmentType;
  title: string;
  durationMinutes: number;

  /** Guest involved (if any) */
  guestId?: string;
  guestName?: string;

  /** Content for the segment */
  content?: MonologueContent | InterviewContent | PerformanceContent | GameContent;

  /** Actual recording data */
  tapedTick?: number;
  qualityScore?: number;
  audienceReaction?: 'cold' | 'mild' | 'warm' | 'hot' | 'standing_ovation';
}

export interface MonologueContent {
  type: 'monologue';
  jokes: MonologueJoke[];
  callbacksUsed: string[]; // References to previous bits
}

export interface MonologueJoke {
  setup: string;
  punchline: string;
  topic: string;
  /** Expected reaction intensity 0-100 */
  expectedReaction: number;
}

export interface InterviewContent {
  type: 'interview';
  guestBio: string;
  promotingWhat?: string; // Movie, book, album, etc.
  preparedTopics: InterviewTopic[];
  funFacts: string[];
}

export interface InterviewTopic {
  question: string;
  followUps: string[];
  expectedDuration: number; // minutes
  sensitivity: 'safe' | 'edgy' | 'controversial';
}

export interface PerformanceContent {
  type: 'performance';
  performerName: string;
  performanceType: 'musical' | 'comedy' | 'magic' | 'other';
  songOrActTitle: string;
  backupNeeded: boolean;
}

export interface GameContent {
  type: 'game';
  gameName: string;
  rules: string;
  prizes?: string[];
  requiresAudience: boolean;
}

// ============================================================================
// GUEST BOOKING
// ============================================================================

export interface GuestBooking {
  id: string;
  agentId: string;
  agentName: string;

  /** What they're promoting */
  promotion?: string;

  /** Topics they'll discuss */
  approvedTopics: string[];
  forbiddenTopics: string[];

  /** Booking status */
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  bookedForEpisode?: string;

  /** Guest tier affects segment length */
  tier: 'a_list' | 'b_list' | 'c_list' | 'emerging' | 'local';

  /** Requirements */
  requiresGreenRoom: boolean;
  dietaryRestrictions?: string[];
  travelArranged: boolean;
}

// ============================================================================
// SHOW CONFIGURATION
// ============================================================================

export interface TalkShowConfig {
  showId: string;
  style: TalkShowStyle;
  hostIds: string[];
  defaultSegments: SegmentType[];
  episodeDurationMinutes: number;
  studioCapacity: number;
}

// ============================================================================
// TALK SHOW MANAGER
// ============================================================================

export class TalkShowManager {
  private events!: SystemEventManager;
  private episodes: Map<string, TalkShowEpisode> = new Map();
  private bookings: Map<string, GuestBooking> = new Map();

  /** Show configurations */
  private showConfigs: Map<string, TalkShowConfig> = new Map();

  setEventBus(eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, 'TalkShowSystem');
  }

  configureShow(config: {
    showId: string;
    style: TalkShowStyle;
    hostIds: string[];
    episodeDurationMinutes?: number;
    studioCapacity?: number;
  }): void {
    const defaultSegments = this.getDefaultSegments(config.style);

    const fullConfig: TalkShowConfig = {
      showId: config.showId,
      style: config.style,
      hostIds: config.hostIds,
      defaultSegments,
      episodeDurationMinutes: config.episodeDurationMinutes ?? 60,
      studioCapacity: config.studioCapacity ?? 200,
    };

    this.showConfigs.set(config.showId, fullConfig);
  }

  private getDefaultSegments(style: TalkShowStyle): SegmentType[] {
    switch (style) {
      case 'late_night':
        return ['monologue', 'desk_bit', 'interview', 'interview', 'performance', 'closing'];
      case 'morning':
        return ['interview', 'remote', 'interview', 'audience', 'performance', 'closing'];
      case 'daytime':
        return ['audience', 'interview', 'interview', 'audience', 'closing'];
      case 'interview':
        return ['interview', 'interview', 'closing'];
      case 'variety':
        return ['monologue', 'performance', 'game', 'performance', 'interview', 'closing'];
      case 'panel':
        return ['panel', 'panel', 'audience', 'closing'];
      default:
        return ['interview', 'closing'];
    }
  }

  // ============================================================================
  // EPISODE PLANNING
  // ============================================================================

  planEpisode(showId: string, episodeNumber: number, airDate: number): TalkShowEpisode | null {
    const config = this.showConfigs.get(showId);
    if (!config) return null;

    const episode: TalkShowEpisode = {
      id: `episode_${showId}_${episodeNumber}`,
      showId,
      episodeNumber,
      airDate,
      hosts: [...config.hostIds],
      segments: this.createSegmentsFromTemplate(config),
      status: 'planning',
      studioAudienceSize: 0,
      audienceEnergyLevel: 50,
    };

    this.episodes.set(episode.id, episode);

    this.events.emitGeneric('tv:talk_show:episode_planned', {
      episodeId: episode.id,
      episodeNumber,
      airDate,
      segmentCount: episode.segments.length,
    }, showId);

    return episode;
  }

  private createSegmentsFromTemplate(config: TalkShowConfig): TalkShowSegment[] {
    const segments: TalkShowSegment[] = [];
    const minutesPerSegment = config.episodeDurationMinutes / config.defaultSegments.length;

    for (let i = 0; i < config.defaultSegments.length; i++) {
      const type = config.defaultSegments[i]!;
      segments.push({
        id: `seg_${Date.now()}_${i}`,
        type,
        title: this.getDefaultSegmentTitle(type, i),
        durationMinutes: this.getSegmentDuration(type, minutesPerSegment),
      });
    }

    return segments;
  }

  private getDefaultSegmentTitle(type: SegmentType, _index: number): string {
    switch (type) {
      case 'monologue': return 'Opening Monologue';
      case 'desk_bit': return 'Desk Segment';
      case 'interview': return 'Guest Interview';
      case 'performance': return 'Musical Performance';
      case 'game': return 'Game Segment';
      case 'audience': return 'Audience Q&A';
      case 'panel': return 'Panel Discussion';
      case 'remote': return 'Pre-Recorded Segment';
      case 'closing': return 'Closing';
      default: return 'Segment';
    }
  }

  private getSegmentDuration(type: SegmentType, defaultDuration: number): number {
    switch (type) {
      case 'monologue': return 8;
      case 'desk_bit': return 5;
      case 'interview': return 12;
      case 'performance': return 4;
      case 'game': return 8;
      case 'audience': return 6;
      case 'panel': return 15;
      case 'remote': return 3;
      case 'closing': return 2;
      default: return defaultDuration;
    }
  }

  // ============================================================================
  // GUEST BOOKING
  // ============================================================================

  requestGuest(
    agentId: string,
    agentName: string,
    tier: GuestBooking['tier'],
    promotion?: string
  ): GuestBooking {
    const booking: GuestBooking = {
      id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      agentName,
      promotion,
      approvedTopics: [],
      forbiddenTopics: [],
      status: 'requested',
      tier,
      requiresGreenRoom: tier === 'a_list' || tier === 'b_list',
      travelArranged: false,
    };

    this.bookings.set(booking.id, booking);

    this.events.emitGeneric('tv:talk_show:guest_requested', {
      bookingId: booking.id,
      guestName: agentName,
      tier,
      promotion,
    }, agentId);

    return booking;
  }

  confirmBooking(bookingId: string, episodeId: string): boolean {
    const booking = this.bookings.get(bookingId);
    const episode = this.episodes.get(episodeId);

    if (!booking || !episode) return false;

    booking.status = 'confirmed';
    booking.bookedForEpisode = episodeId;

    // Assign to an interview segment
    const interviewSegment = episode.segments.find(
      s => s.type === 'interview' && !s.guestId
    );

    if (interviewSegment) {
      interviewSegment.guestId = booking.agentId;
      interviewSegment.guestName = booking.agentName;
      interviewSegment.title = `Interview: ${booking.agentName}`;

      // Adjust duration based on tier
      if (booking.tier === 'a_list') {
        interviewSegment.durationMinutes = 15;
      } else if (booking.tier === 'b_list') {
        interviewSegment.durationMinutes = 12;
      }
    }

    if (episode.status === 'planning') {
      episode.status = 'booking';
    }

    this.events.emitGeneric('tv:talk_show:guest_confirmed', {
      bookingId,
      episodeId,
      guestName: booking.agentName,
      tier: booking.tier,
    }, episode.showId);

    return true;
  }

  cancelBooking(bookingId: string, reason: string): boolean {
    const booking = this.bookings.get(bookingId);
    if (!booking || booking.status === 'completed') return false;

    booking.status = 'cancelled';

    // Remove from episode if assigned
    if (booking.bookedForEpisode) {
      const episode = this.episodes.get(booking.bookedForEpisode);
      if (episode) {
        const segment = episode.segments.find(s => s.guestId === booking.agentId);
        if (segment) {
          segment.guestId = undefined;
          segment.guestName = undefined;
          segment.title = 'Guest Interview (TBD)';
        }
      }
    }

    this.events.emitGeneric('tv:talk_show:guest_cancelled', {
      bookingId,
      guestName: booking.agentName,
      reason,
    }, booking.agentId);

    return true;
  }

  // ============================================================================
  // CONTENT GENERATION
  // ============================================================================

  generateMonologue(episodeId: string): MonologueContent | null {
    const episode = this.episodes.get(episodeId);
    if (!episode) return null;

    // Generate topical jokes - would integrate with LLM
    const jokes: MonologueJoke[] = [
      {
        setup: 'Did you hear about the new restaurant in town?',
        punchline: 'The food is great, but the service is a bit wooden.',
        topic: 'local',
        expectedReaction: 60,
      },
      {
        setup: 'The weather has been crazy lately.',
        punchline: 'Even the sun is taking sick days.',
        topic: 'weather',
        expectedReaction: 55,
      },
    ];

    const content: MonologueContent = {
      type: 'monologue',
      jokes,
      callbacksUsed: [],
    };

    // Assign to monologue segment
    const monologueSegment = episode.segments.find(s => s.type === 'monologue');
    if (monologueSegment) {
      monologueSegment.content = content;
    }

    return content;
  }

  generateInterviewContent(episodeId: string, guestId: string): InterviewContent | null {
    const episode = this.episodes.get(episodeId);
    if (!episode) return null;

    const segment = episode.segments.find(
      s => s.type === 'interview' && s.guestId === guestId
    );
    if (!segment) return null;

    const booking = Array.from(this.bookings.values()).find(b => b.agentId === guestId);

    // Generate interview content - would integrate with LLM
    const content: InterviewContent = {
      type: 'interview',
      guestBio: `${segment.guestName} is a notable figure in our village.`,
      promotingWhat: booking?.promotion,
      preparedTopics: [
        {
          question: 'Tell us about your latest project.',
          followUps: ['How did you get involved?', 'What was the biggest challenge?'],
          expectedDuration: 3,
          sensitivity: 'safe',
        },
        {
          question: 'What do you do to relax?',
          followUps: ['Do you have any hobbies?'],
          expectedDuration: 2,
          sensitivity: 'safe',
        },
      ],
      funFacts: ['Loves cooking', 'Has three cats'],
    };

    segment.content = content;
    return content;
  }

  // ============================================================================
  // TAPING
  // ============================================================================

  startTaping(episodeId: string, _currentTick: number): boolean {
    const episode = this.episodes.get(episodeId);
    if (!episode || episode.status === 'taping' || episode.status === 'complete') {
      return false;
    }

    episode.status = 'taping';

    this.events.emitGeneric('tv:talk_show:taping_started', {
      episodeId,
      episodeNumber: episode.episodeNumber,
      hosts: episode.hosts,
      audienceSize: episode.studioAudienceSize,
    }, episode.showId);

    return true;
  }

  tapeSegment(
    episodeId: string,
    segmentIndex: number,
    currentTick: number,
    audienceReaction: TalkShowSegment['audienceReaction']
  ): boolean {
    const episode = this.episodes.get(episodeId);
    if (!episode || episode.status !== 'taping') return false;

    const segment = episode.segments[segmentIndex];
    if (!segment) return false;

    segment.tapedTick = currentTick;
    segment.audienceReaction = audienceReaction;

    // Calculate quality score based on audience reaction
    const reactionScores: Record<string, number> = {
      cold: 30,
      mild: 50,
      warm: 70,
      hot: 85,
      standing_ovation: 100,
    };
    const reaction = audienceReaction ?? 'mild';
    segment.qualityScore = reactionScores[reaction] ?? 50;

    // Update audience energy
    const qualityScore = segment.qualityScore ?? 50;
    const energyChange = qualityScore > 70 ? 5 : qualityScore < 50 ? -5 : 0;
    episode.audienceEnergyLevel = Math.max(0, Math.min(100, episode.audienceEnergyLevel + energyChange));

    this.events.emitGeneric('tv:talk_show:segment_taped', {
      episodeId,
      segmentId: segment.id,
      segmentType: segment.type,
      audienceReaction,
      qualityScore: segment.qualityScore,
    }, episode.showId);

    // Check if all segments are taped
    if (episode.segments.every(s => s.tapedTick !== undefined)) {
      episode.status = 'complete';

      this.events.emitGeneric('tv:talk_show:taping_complete', {
        episodeId,
        episodeNumber: episode.episodeNumber,
        averageQuality: this.calculateAverageQuality(episode),
      }, episode.showId);
    }

    return true;
  }

  private calculateAverageQuality(episode: TalkShowEpisode): number {
    const scores = episode.segments
      .filter(s => s.qualityScore !== undefined)
      .map(s => s.qualityScore!);

    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // ============================================================================
  // AUDIENCE MANAGEMENT
  // ============================================================================

  setStudioAudience(episodeId: string, size: number): boolean {
    const episode = this.episodes.get(episodeId);
    if (!episode) return false;

    const config = this.showConfigs.get(episode.showId);
    const maxCapacity = config?.studioCapacity ?? 200;

    episode.studioAudienceSize = Math.min(size, maxCapacity);
    episode.audienceEnergyLevel = 50 + Math.random() * 20; // 50-70 starting energy

    return true;
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  getEpisode(episodeId: string): TalkShowEpisode | undefined {
    return this.episodes.get(episodeId);
  }

  getShowEpisodes(showId: string): TalkShowEpisode[] {
    return Array.from(this.episodes.values()).filter(e => e.showId === showId);
  }

  getBooking(bookingId: string): GuestBooking | undefined {
    return this.bookings.get(bookingId);
  }

  getGuestBookings(agentId: string): GuestBooking[] {
    return Array.from(this.bookings.values()).filter(b => b.agentId === agentId);
  }

  getPendingBookings(): GuestBooking[] {
    return Array.from(this.bookings.values()).filter(b => b.status === 'requested');
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup(): void {
    this.episodes.clear();
    this.bookings.clear();
    this.showConfigs.clear();
    this.events.cleanup();
  }
}

// ============================================================================
// TALK SHOW SYSTEM
// ============================================================================

export class TalkShowSystem extends BaseSystem {
  readonly id = 'TalkShowSystem';
  readonly priority = 71;
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private manager = new TalkShowManager();

  protected onInitialize(_world: World, eventBus: EventBus): void {
    this.manager.setEventBus(eventBus);
  }

  getManager(): TalkShowManager {
    return this.manager;
  }

  protected onUpdate(_ctx: SystemContext): void {
    // Talk show system is primarily driven by events and manager calls
    // rather than per-tick updates
  }

  protected onCleanup(): void {
    this.manager.cleanup();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let talkShowSystemInstance: TalkShowSystem | null = null;

export function getTalkShowSystem(): TalkShowSystem {
  if (!talkShowSystemInstance) {
    talkShowSystemInstance = new TalkShowSystem();
  }
  return talkShowSystemInstance;
}

export function resetTalkShowSystem(): void {
  if (talkShowSystemInstance) {
    talkShowSystemInstance.cleanup();
  }
  talkShowSystemInstance = null;
}
