/**
 * TVDevelopmentSystem - Show pitching and greenlighting
 *
 * Handles:
 * - Writers pitching show concepts to stations
 * - Station managers evaluating pitches
 * - Greenlighting decisions
 * - Assigning production teams
 * - Show creation from approved concepts
 */

import type { System } from '../../ecs/System.js';
import type { World } from '../../ecs/World.js';
import type { Entity } from '../../ecs/Entity.js';
import type { EventBus } from '../../events/EventBus.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { TVStationComponent } from '../TVStation.js';
import type { TVShowComponent, ShowFormat, TargetAudience } from '../TVShow.js';
import { createTVShowComponent, createShowCharacter } from '../TVShow.js';
import { getEmployeesByRole, assignCrewToProduction, createProduction } from '../TVStation.js';
import { createTVContentComponent, createTVScript } from '../TVContent.js';

/** How often to process pitches (every 5 game minutes) */
const PITCH_PROCESSING_INTERVAL = 20 * 60 * 5;

/** Maximum shows a station can have in development */
const MAX_SHOWS_IN_DEVELOPMENT = 5;

// ============================================================================
// SHOW CONCEPT TYPES
// ============================================================================

export interface ShowConcept {
  title: string;
  format: ShowFormat;
  premise: string;
  targetAudience: TargetAudience;
  genres: string[];
  themes: string[];
  estimatedBudgetPerEpisode: number;
  episodesPerSeason: number;
  /** Key character descriptions */
  characterConcepts: CharacterConcept[];
  /** Unique selling points */
  hooks: string[];
}

export interface CharacterConcept {
  name: string;
  archetype: string;
  personality: string;
  role: 'lead' | 'supporting' | 'recurring';
}

export interface PitchSubmission {
  id: string;
  writerId: string;
  writerName: string;
  stationId: string;
  concept: ShowConcept;
  submittedTick: number;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  reviewNotes?: string;
}

export interface GreenlightDecision {
  pitchId: string;
  approved: boolean;
  reason: string;
  assignedBudget?: number;
  assignedProducer?: string;
}

// ============================================================================
// SYSTEM
// ============================================================================

export class TVDevelopmentSystem implements System {
  readonly id = 'tv_development' as const;
  readonly priority = 62; // Before production systems
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private eventBus: EventBus | null = null;
  private lastProcessTick: number = 0;

  /** Pending pitch submissions */
  private pendingPitches: Map<string, PitchSubmission> = new Map();

  /** Track which writers have active pitches */
  private writerPitchCount: Map<string, number> = new Map();

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    // Only process periodically
    if (currentTick - this.lastProcessTick < PITCH_PROCESSING_INTERVAL) {
      return;
    }

    this.lastProcessTick = currentTick;

    for (const entity of entities) {
      const station = entity.components.get(ComponentType.TVStation) as TVStationComponent | undefined;
      if (!station) continue;

      // Process pending pitches for this station
      this.processPendingPitches(world, station, currentTick);

      // Check if station needs new content
      this.checkContentNeeds(world, station, currentTick);
    }
  }

  // ============================================================================
  // PITCH SUBMISSION
  // ============================================================================

  /**
   * Submit a show pitch to a station
   */
  submitPitch(
    world: World,
    writerId: string,
    stationId: string,
    concept: ShowConcept
  ): PitchSubmission | null {
    // Check writer pitch limit (max 2 active pitches)
    const activeCount = this.writerPitchCount.get(writerId) ?? 0;
    if (activeCount >= 2) {
      return null;
    }

    // Get writer name
    const writerEntity = world.getEntity(writerId);
    if (!writerEntity) return null;

    const identity = writerEntity.components.get(ComponentType.Identity) as any;
    const writerName = identity?.name ?? 'Unknown Writer';

    // Create pitch
    const pitch: PitchSubmission = {
      id: `pitch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      writerId,
      writerName,
      stationId,
      concept,
      submittedTick: world.tick,
      status: 'pending',
    };

    this.pendingPitches.set(pitch.id, pitch);
    this.writerPitchCount.set(writerId, activeCount + 1);

    // Emit event
    this.eventBus?.emit({
      type: 'tv:pitch:submitted' as any,
      source: writerId,
      data: {
        pitchId: pitch.id,
        writerId,
        stationId,
        title: concept.title,
        format: concept.format,
      },
    });

    return pitch;
  }

  // ============================================================================
  // PITCH PROCESSING
  // ============================================================================

  /**
   * Process pending pitches for a station
   */
  private processPendingPitches(
    world: World,
    station: TVStationComponent,
    currentTick: number
  ): void {
    // Count shows in development
    const showsInDev = this.countShowsInDevelopment(world, station.buildingId);
    if (showsInDev >= MAX_SHOWS_IN_DEVELOPMENT) {
      return; // Station is at capacity
    }

    // Get station's pending pitches
    const stationPitches = Array.from(this.pendingPitches.values())
      .filter(p => p.stationId === station.buildingId && p.status === 'pending');

    if (stationPitches.length === 0) return;

    // Evaluate each pitch
    for (const pitch of stationPitches) {
      const decision = this.evaluatePitch(world, station, pitch);

      if (decision.approved) {
        this.greenlightShow(world, station, pitch, decision, currentTick);
      } else {
        this.rejectPitch(pitch, decision.reason);
      }

      // Update writer pitch count
      const count = this.writerPitchCount.get(pitch.writerId) ?? 1;
      this.writerPitchCount.set(pitch.writerId, Math.max(0, count - 1));

      // Remove from pending
      this.pendingPitches.delete(pitch.id);
    }
  }

  /**
   * Evaluate a pitch for greenlighting
   */
  private evaluatePitch(
    world: World,
    station: TVStationComponent,
    pitch: PitchSubmission
  ): GreenlightDecision {
    const concept = pitch.concept;

    // Check budget feasibility
    const seasonCost = concept.estimatedBudgetPerEpisode * concept.episodesPerSeason;
    if (seasonCost > station.budget * 0.5) {
      return {
        pitchId: pitch.id,
        approved: false,
        reason: 'Budget too high for current station finances',
      };
    }

    // Check if format fits station
    const hasNewsChannel = station.channels.some(c => c.format === 'news');
    if (concept.format === 'news' && !hasNewsChannel) {
      return {
        pitchId: pitch.id,
        approved: false,
        reason: 'Station lacks news channel for this format',
      };
    }

    // Check writer's track record
    const writerReputation = this.getWriterReputation(world, pitch.writerId);

    // Score the concept
    let score = 50; // Base score

    // Originality bonus
    if (concept.hooks.length >= 2) score += 15;

    // Strong characters bonus
    if (concept.characterConcepts.length >= 3) score += 10;

    // Writer reputation
    score += writerReputation * 20;

    // Popular formats bonus
    if (['sitcom', 'drama', 'reality_tv'].includes(concept.format)) {
      score += 10;
    }

    // Station reputation influences standards
    const threshold = 40 + (station.reputation / 5); // 40-60 threshold

    if (score >= threshold) {
      return {
        pitchId: pitch.id,
        approved: true,
        reason: `Strong concept with score ${score.toFixed(0)}`,
        assignedBudget: seasonCost,
        assignedProducer: this.findAvailableProducer(station),
      };
    }

    return {
      pitchId: pitch.id,
      approved: false,
      reason: `Concept score ${score.toFixed(0)} below threshold ${threshold.toFixed(0)}`,
    };
  }

  /**
   * Greenlight a show from approved pitch
   */
  private greenlightShow(
    world: World,
    station: TVStationComponent,
    pitch: PitchSubmission,
    decision: GreenlightDecision,
    currentTick: number
  ): void {
    const concept = pitch.concept;

    // Create show entity
    const showEntity = world.createEntity();

    // Create show component
    const show = createTVShowComponent(
      concept.title,
      concept.format,
      station.buildingId,
      pitch.writerId,
      currentTick
    );

    // Populate from concept
    show.premise = concept.premise;
    show.genres = concept.genres;
    show.themes = concept.themes;
    show.targetAudience = concept.targetAudience;

    // Create characters
    for (const charConcept of concept.characterConcepts) {
      const character = createShowCharacter(
        charConcept.name,
        charConcept.personality,
        charConcept.archetype
      );
      show.characters.push(character);
    }

    // Set show bible
    show.showBible = {
      tone: this.inferTone(concept),
      visualStyle: this.inferVisualStyle(concept.format),
      prohibitedTopics: [],
      signatureElements: concept.hooks,
    };

    // Add component to entity
    (showEntity as any).addComponent(show);

    // Add to station's active shows
    station.activeShows.push(show.showId);

    // Deduct budget
    if (decision.assignedBudget) {
      station.budget -= decision.assignedBudget;
    }

    // Create initial production
    const contentEntity = world.createEntity();
    const content = createTVContentComponent(
      'episode',
      show.showId,
      `${concept.title} - Pilot`,
      currentTick,
      { season: 1, episodeNumber: 1 }
    );
    (contentEntity as any).addComponent(content);

    // Create script for pilot
    const script = createTVScript(
      show.showId,
      1,
      1,
      'Pilot',
      [pitch.writerId],
      currentTick
    );
    script.logline = concept.premise;
    content.script = script;

    // Create production entry
    const production = createProduction(
      show.showId,
      content.contentId,
      1,
      1,
      decision.assignedBudget ?? concept.estimatedBudgetPerEpisode,
      currentTick
    );
    station.activeProductions.push(production);

    // Assign producer if available
    if (decision.assignedProducer) {
      assignCrewToProduction(production, 'producer', decision.assignedProducer);
    }

    // Assign writer
    assignCrewToProduction(production, 'writer', pitch.writerId);

    // Update pitch status
    pitch.status = 'approved';
    pitch.reviewNotes = decision.reason;

    // Emit events
    this.eventBus?.emit({
      type: 'tv:show:greenlit' as any,
      source: station.buildingId,
      data: {
        showId: show.showId,
        stationId: station.buildingId,
        title: concept.title,
        format: concept.format,
        creatorId: pitch.writerId,
      },
    });
  }

  /**
   * Reject a pitch
   */
  private rejectPitch(pitch: PitchSubmission, reason: string): void {
    pitch.status = 'rejected';
    pitch.reviewNotes = reason;

    this.eventBus?.emit({
      type: 'tv:pitch:rejected' as any,
      source: pitch.stationId,
      data: {
        pitchId: pitch.id,
        writerId: pitch.writerId,
        title: pitch.concept.title,
        reason,
      },
    });
  }

  // ============================================================================
  // CONTENT NEEDS
  // ============================================================================

  /**
   * Check if station needs new shows
   */
  private checkContentNeeds(
    world: World,
    station: TVStationComponent,
    _currentTick: number
  ): void {
    // Count active shows by format
    const showsByFormat = new Map<ShowFormat, number>();

    for (const showId of station.activeShows) {
      const show = this.findShow(world, showId);
      if (show && show.status === 'airing') {
        const count = showsByFormat.get(show.format) ?? 0;
        showsByFormat.set(show.format, count + 1);
      }
    }

    // Check if any format is underrepresented
    const neededFormats: ShowFormat[] = [];

    // Every station should have at least 1 sitcom and 1 drama
    if ((showsByFormat.get('sitcom') ?? 0) < 1) {
      neededFormats.push('sitcom');
    }
    if ((showsByFormat.get('drama') ?? 0) < 1) {
      neededFormats.push('drama');
    }

    // Emit content needs event for writer agents to pick up
    if (neededFormats.length > 0) {
      this.eventBus?.emit({
        type: 'tv:station:needs_content' as any,
        source: station.buildingId,
        data: {
          stationId: station.buildingId,
          neededFormats,
          budget: station.budget,
        },
      });
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private countShowsInDevelopment(world: World, stationId: string): number {
    const shows = world.query().with(ComponentType.TVShow).executeEntities();
    let count = 0;

    for (const entity of shows) {
      const show = entity.components.get(ComponentType.TVShow) as TVShowComponent;
      if (show && show.stationId === stationId && show.status === 'in_development') {
        count++;
      }
    }

    return count;
  }

  private getWriterReputation(world: World, writerId: string): number {
    // Check past show ratings
    const shows = world.query().with(ComponentType.TVShow).executeEntities();
    let totalRating = 0;
    let showCount = 0;

    for (const entity of shows) {
      const show = entity.components.get(ComponentType.TVShow) as TVShowComponent;
      if (show && show.creator === writerId && show.averageRating > 0) {
        totalRating += show.averageRating;
        showCount++;
      }
    }

    if (showCount === 0) return 0.5; // Unknown writer gets neutral score
    return Math.min(1, totalRating / showCount / 10);
  }

  private findAvailableProducer(station: TVStationComponent): string | undefined {
    const producers = getEmployeesByRole(station, 'producer');
    const busyProducers = new Set<string>();

    for (const production of station.activeProductions) {
      const assigned = production.crew.get('producer');
      if (assigned) {
        for (const id of assigned) {
          busyProducers.add(id);
        }
      }
    }

    const available = producers.find(p => !busyProducers.has(p.agentId));
    return available?.agentId;
  }

  private findShow(world: World, showId: string): TVShowComponent | null {
    const shows = world.query().with(ComponentType.TVShow).executeEntities();
    for (const entity of shows) {
      const show = entity.components.get(ComponentType.TVShow) as TVShowComponent;
      if (show && show.showId === showId) {
        return show;
      }
    }
    return null;
  }

  private inferTone(concept: ShowConcept): string {
    if (concept.format === 'sitcom' || concept.format === 'late_night') {
      return 'comedic';
    }
    if (concept.format === 'drama' || concept.format === 'soap_opera') {
      return 'dramatic';
    }
    if (concept.format === 'news' || concept.format === 'documentary') {
      return 'serious';
    }
    if (concept.format === 'childrens') {
      return 'lighthearted';
    }
    return 'balanced';
  }

  private inferVisualStyle(format: ShowFormat): string {
    switch (format) {
      case 'sitcom':
        return 'bright, multi-camera setup';
      case 'drama':
        return 'cinematic, single-camera';
      case 'soap_opera':
        return 'intimate, close-ups';
      case 'news':
        return 'professional, clean graphics';
      case 'talk_show':
        return 'warm, inviting set';
      case 'game_show':
        return 'flashy, energetic';
      default:
        return 'standard television';
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get pending pitches for a station
   */
  getPendingPitches(stationId: string): PitchSubmission[] {
    return Array.from(this.pendingPitches.values())
      .filter(p => p.stationId === stationId && p.status === 'pending');
  }

  /**
   * Get a writer's active pitches
   */
  getWriterPitches(writerId: string): PitchSubmission[] {
    return Array.from(this.pendingPitches.values())
      .filter(p => p.writerId === writerId);
  }

  cleanup(): void {
    this.pendingPitches.clear();
    this.writerPitchCount.clear();
    this.eventBus = null;
  }
}
