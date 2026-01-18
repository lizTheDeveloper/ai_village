/**
 * NewsroomSystem - Live news generation and broadcasting
 *
 * Handles:
 * - Breaking news detection from world events
 * - News story prioritization and selection
 * - Anchor assignments and desk management
 * - Live broadcast production
 * - Field reporter dispatching
 */

import type { World } from '../../ecs/World.js';
import type { EventBus } from '../../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../../ecs/SystemContext.js';
import { SystemEventManager } from '../../events/TypedEventEmitter.js';
import { ComponentType } from '../../types/ComponentType.js';

// ============================================================================
// NEWS TYPES
// ============================================================================

export type NewsCategory =
  | 'breaking'      // Urgent breaking news
  | 'local'         // Local community news
  | 'weather'       // Weather updates
  | 'sports'        // Sports coverage
  | 'entertainment' // Entertainment news
  | 'business'      // Business/economy
  | 'politics'      // Political news
  | 'human_interest' // Feel-good stories
  | 'crime'         // Crime reports
  | 'health';       // Health updates

export type NewsPriority = 'critical' | 'high' | 'medium' | 'low' | 'filler';

export interface NewsStory {
  id: string;
  headline: string;
  summary: string;
  category: NewsCategory;
  priority: NewsPriority;

  /** Source event that generated this story */
  sourceEventType?: string;
  sourceEntityId?: string;

  /** Location of the story */
  location?: { x: number; y: number };

  /** When the story was discovered */
  discoveredTick: number;

  /** Freshness decays over time */
  freshnessScore: number;

  /** Whether story has been reported */
  reported: boolean;
  reportedTick?: number;

  /** Field reporter assigned (if any) */
  fieldReporterId?: string;

  /** Generated script for anchor */
  script?: string;
}

export interface NewsDesk {
  id: string;
  stationId: string;
  showId: string;

  /** Anchor(s) at the desk */
  anchors: string[];

  /** Current story queue */
  storyQueue: NewsStory[];

  /** Stories already covered in this broadcast */
  coveredStories: string[];

  /** Field reporters available */
  fieldReporters: FieldReporter[];

  /** Current broadcast state */
  isLive: boolean;
  broadcastStartTick?: number;
  broadcastDurationTicks: number;

  /** Segment timing */
  currentSegment: NewsSegment | null;
  segmentSchedule: NewsSegment[];
}

export interface NewsSegment {
  id: string;
  name: string;
  type: 'headlines' | 'story' | 'weather' | 'sports' | 'field_report' | 'break' | 'closing';
  durationTicks: number;
  assignedAnchor?: string;
  assignedStory?: NewsStory;
}

export interface FieldReporter {
  agentId: string;
  name: string;
  status: 'available' | 'en_route' | 'on_scene' | 'reporting_live';
  assignedStoryId?: string;
  location?: { x: number; y: number };
  /** Quality of their reports 0-100 */
  reportingSkill: number;
}

// ============================================================================
// NEWS DESK MANAGER
// ============================================================================

export class NewsDeskManager {
  private events!: SystemEventManager;
  private desks: Map<string, NewsDesk> = new Map();
  private pendingStories: NewsStory[] = [];

  setEventBus(eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, 'NewsroomSystem');
  }

  // ============================================================================
  // DESK MANAGEMENT
  // ============================================================================

  createNewsDesk(stationId: string, showId: string): NewsDesk {
    const desk: NewsDesk = {
      id: `desk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stationId,
      showId,
      anchors: [],
      storyQueue: [],
      coveredStories: [],
      fieldReporters: [],
      isLive: false,
      broadcastDurationTicks: 30 * 60 * 20, // 30 min at 20 ticks/sec
      currentSegment: null,
      segmentSchedule: [],
    };

    this.desks.set(desk.id, desk);
    return desk;
  }

  getDesk(deskId: string): NewsDesk | undefined {
    return this.desks.get(deskId);
  }

  getDesksByStation(stationId: string): NewsDesk[] {
    return Array.from(this.desks.values()).filter(d => d.stationId === stationId);
  }

  // ============================================================================
  // ANCHOR MANAGEMENT
  // ============================================================================

  assignAnchor(deskId: string, agentId: string): boolean {
    const desk = this.desks.get(deskId);
    if (!desk) return false;

    if (!desk.anchors.includes(agentId)) {
      desk.anchors.push(agentId);
    }
    return true;
  }

  removeAnchor(deskId: string, agentId: string): boolean {
    const desk = this.desks.get(deskId);
    if (!desk) return false;

    const index = desk.anchors.indexOf(agentId);
    if (index >= 0) {
      desk.anchors.splice(index, 1);
      return true;
    }
    return false;
  }

  // ============================================================================
  // FIELD REPORTERS
  // ============================================================================

  addFieldReporter(deskId: string, agentId: string, name: string, skill: number): boolean {
    const desk = this.desks.get(deskId);
    if (!desk) return false;

    const reporter: FieldReporter = {
      agentId,
      name,
      status: 'available',
      reportingSkill: Math.max(0, Math.min(100, skill)),
    };

    desk.fieldReporters.push(reporter);
    return true;
  }

  dispatchReporter(deskId: string, agentId: string, storyId: string): boolean {
    const desk = this.desks.get(deskId);
    if (!desk) return false;

    const reporter = desk.fieldReporters.find(r => r.agentId === agentId);
    const story = desk.storyQueue.find(s => s.id === storyId);

    if (!reporter || !story || reporter.status !== 'available') return false;

    reporter.status = 'en_route';
    reporter.assignedStoryId = storyId;
    story.fieldReporterId = agentId;

    this.events.emitGeneric('tv:news:reporter_dispatched', {
      deskId,
      reporterId: agentId,
      reporterName: reporter.name,
      storyId,
      headline: story.headline,
    }, desk.showId);

    return true;
  }

  reporterArrived(deskId: string, agentId: string): boolean {
    const desk = this.desks.get(deskId);
    if (!desk) return false;

    const reporter = desk.fieldReporters.find(r => r.agentId === agentId);
    if (!reporter || reporter.status !== 'en_route') return false;

    reporter.status = 'on_scene';
    return true;
  }

  startLiveReport(deskId: string, agentId: string): boolean {
    const desk = this.desks.get(deskId);
    if (!desk) return false;

    const reporter = desk.fieldReporters.find(r => r.agentId === agentId);
    if (!reporter || reporter.status !== 'on_scene') return false;

    reporter.status = 'reporting_live';

    this.events.emitGeneric('tv:news:live_report_started', {
      deskId,
      reporterId: agentId,
      reporterName: reporter.name,
      storyId: reporter.assignedStoryId,
    }, desk.showId);

    return true;
  }

  endLiveReport(deskId: string, agentId: string): boolean {
    const desk = this.desks.get(deskId);
    if (!desk) return false;

    const reporter = desk.fieldReporters.find(r => r.agentId === agentId);
    if (!reporter || reporter.status !== 'reporting_live') return false;

    reporter.status = 'available';
    reporter.assignedStoryId = undefined;
    return true;
  }

  // ============================================================================
  // STORY MANAGEMENT
  // ============================================================================

  /**
   * Submit a news story from a world event
   */
  submitStory(story: Omit<NewsStory, 'id' | 'freshnessScore' | 'reported'>): NewsStory {
    const fullStory: NewsStory = {
      ...story,
      id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      freshnessScore: 100,
      reported: false,
    };

    this.pendingStories.push(fullStory);

    this.events.emitGeneric('tv:news:story_submitted', {
      storyId: fullStory.id,
      headline: fullStory.headline,
      category: fullStory.category,
      priority: fullStory.priority,
    }, 'newsroom');

    return fullStory;
  }

  /**
   * Assign pending stories to desks based on priority and freshness
   */
  distributePendingStories(): void {
    // Sort by priority and freshness
    const priorityOrder: Record<NewsPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      filler: 4,
    };

    this.pendingStories.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.freshnessScore - a.freshnessScore;
    });

    // Distribute to desks
    for (const story of this.pendingStories) {
      // Find desk with capacity
      for (const desk of this.desks.values()) {
        if (desk.storyQueue.length < 10) { // Max queue size
          desk.storyQueue.push(story);
          break;
        }
      }
    }

    this.pendingStories = [];
  }

  /**
   * Update story freshness (called each tick)
   */
  decayStoryFreshness(decayRate: number = 0.1): void {
    for (const desk of this.desks.values()) {
      for (const story of desk.storyQueue) {
        if (!story.reported) {
          story.freshnessScore = Math.max(0, story.freshnessScore - decayRate);
        }
      }
    }

    for (const story of this.pendingStories) {
      story.freshnessScore = Math.max(0, story.freshnessScore - decayRate);
    }
  }

  // ============================================================================
  // BROADCAST MANAGEMENT
  // ============================================================================

  /**
   * Start a live news broadcast
   */
  startBroadcast(deskId: string, currentTick: number): boolean {
    const desk = this.desks.get(deskId);
    if (!desk || desk.isLive || desk.anchors.length === 0) return false;

    desk.isLive = true;
    desk.broadcastStartTick = currentTick;
    desk.coveredStories = [];

    // Generate segment schedule
    desk.segmentSchedule = this.generateSegmentSchedule(desk);
    desk.currentSegment = desk.segmentSchedule[0] ?? null;

    this.events.emitGeneric('tv:news:broadcast_started', {
      deskId,
      stationId: desk.stationId,
      anchors: desk.anchors,
      storyCount: desk.storyQueue.length,
    }, desk.showId);

    return true;
  }

  /**
   * Generate a segment schedule for the broadcast
   */
  private generateSegmentSchedule(desk: NewsDesk): NewsSegment[] {
    const segments: NewsSegment[] = [];
    const ticksPerMinute = 60 * 20;

    // Opening headlines (2 min)
    segments.push({
      id: `seg_headlines_${Date.now()}`,
      name: 'Headlines',
      type: 'headlines',
      durationTicks: 2 * ticksPerMinute,
      assignedAnchor: desk.anchors[0],
    });

    // Main stories (variable)
    const topStories = desk.storyQueue
      .filter(s => !s.reported)
      .slice(0, 5);

    for (const story of topStories) {
      const duration = story.priority === 'critical' ? 4 : story.priority === 'high' ? 3 : 2;
      segments.push({
        id: `seg_story_${story.id}`,
        name: story.headline,
        type: 'story',
        durationTicks: duration * ticksPerMinute,
        assignedStory: story,
        assignedAnchor: desk.anchors[0],
      });
    }

    // Weather (3 min)
    segments.push({
      id: `seg_weather_${Date.now()}`,
      name: 'Weather',
      type: 'weather',
      durationTicks: 3 * ticksPerMinute,
    });

    // Sports (3 min)
    segments.push({
      id: `seg_sports_${Date.now()}`,
      name: 'Sports',
      type: 'sports',
      durationTicks: 3 * ticksPerMinute,
    });

    // Closing (1 min)
    segments.push({
      id: `seg_closing_${Date.now()}`,
      name: 'Closing',
      type: 'closing',
      durationTicks: 1 * ticksPerMinute,
      assignedAnchor: desk.anchors[0],
    });

    return segments;
  }

  /**
   * Advance to next segment
   */
  advanceSegment(deskId: string, currentTick: number): NewsSegment | null {
    const desk = this.desks.get(deskId);
    if (!desk || !desk.isLive) return null;

    // Mark current story as covered
    if (desk.currentSegment?.type === 'story' && desk.currentSegment.assignedStory) {
      desk.currentSegment.assignedStory.reported = true;
      desk.currentSegment.assignedStory.reportedTick = currentTick;
      desk.coveredStories.push(desk.currentSegment.assignedStory.id);
    }

    // Find current segment index
    const currentIndex = desk.segmentSchedule.findIndex(s => s.id === desk.currentSegment?.id);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= desk.segmentSchedule.length) {
      // End of broadcast
      this.endBroadcast(deskId, currentTick);
      return null;
    }

    desk.currentSegment = desk.segmentSchedule[nextIndex] ?? null;

    this.events.emitGeneric('tv:news:segment_changed', {
      deskId,
      segmentId: desk.currentSegment?.id,
      segmentName: desk.currentSegment?.name,
      segmentType: desk.currentSegment?.type,
    }, desk.showId);

    return desk.currentSegment;
  }

  /**
   * End a live news broadcast
   */
  endBroadcast(deskId: string, currentTick: number): boolean {
    const desk = this.desks.get(deskId);
    if (!desk || !desk.isLive) return false;

    desk.isLive = false;
    desk.currentSegment = null;
    desk.segmentSchedule = [];

    // Remove covered stories from queue
    desk.storyQueue = desk.storyQueue.filter(s => !desk.coveredStories.includes(s.id));

    const duration = currentTick - (desk.broadcastStartTick ?? currentTick);

    this.events.emitGeneric('tv:news:broadcast_ended', {
      deskId,
      stationId: desk.stationId,
      storiesCovered: desk.coveredStories.length,
      durationTicks: duration,
    }, desk.showId);

    desk.broadcastStartTick = undefined;
    desk.coveredStories = [];

    return true;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup(): void {
    this.desks.clear();
    this.pendingStories = [];
    this.events.cleanup();
  }
}

// ============================================================================
// NEWSROOM SYSTEM
// ============================================================================

export class NewsroomSystem extends BaseSystem {
  readonly id = 'NewsroomSystem';
  readonly priority = 70;
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private deskManager = new NewsDeskManager();

  /** Update every 60 ticks (3 seconds) for non-critical updates */
  protected readonly throttleInterval = 60;

  protected onInitialize(_world: World, eventBus: EventBus): void {
    this.deskManager.setEventBus(eventBus);
  }

  getDeskManager(): NewsDeskManager {
    return this.deskManager;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Decay story freshness
    this.deskManager.decayStoryFreshness();

    // Distribute pending stories
    this.deskManager.distributePendingStories();

    // Process world events for news stories
    this.scanWorldForNews(ctx.world, ctx.tick);
  }

  /**
   * Scan world for newsworthy events
   */
  private scanWorldForNews(_world: World, currentTick: number): void {
    // This would integrate with the event system to detect:
    // - Deaths (crime/tragedy)
    // - Marriages/births (human interest)
    // - Building completions (local news)
    // - Weather changes (weather)
    // - Market changes (business)
    // - Political events (politics)
    // - Sports results (sports)
    // - Festival/events (entertainment)

    // For now, placeholder that would be connected to EventBus subscriptions
    // The actual implementation would subscribe to relevant game events
    // and convert them to news stories

    // Example: Generate random filler stories for testing
    if (Math.random() < 0.01) { // 1% chance per update
      this.deskManager.submitStory({
        headline: 'Local villager finds unusual rock',
        summary: 'A villager discovered an interesting rock formation near the river.',
        category: 'human_interest',
        priority: 'filler',
        discoveredTick: currentTick,
      });
    }
  }

  protected onCleanup(): void {
    this.deskManager.cleanup();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let newsroomSystemInstance: NewsroomSystem | null = null;

export function getNewsroomSystem(): NewsroomSystem {
  if (!newsroomSystemInstance) {
    newsroomSystemInstance = new NewsroomSystem();
  }
  return newsroomSystemInstance;
}

export function resetNewsroomSystem(): void {
  if (newsroomSystemInstance) {
    newsroomSystemInstance.cleanup();
  }
  newsroomSystemInstance = null;
}
