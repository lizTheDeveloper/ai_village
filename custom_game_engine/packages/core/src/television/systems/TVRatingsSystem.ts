/**
 * TVRatingsSystem - Audience measurement and show lifecycle
 *
 * Handles:
 * - Viewer reaction processing
 * - Show ratings calculation
 * - Renewal/cancellation decisions
 * - Cultural impact tracking
 * - Catchphrase spreading
 */

import type { System } from '../../ecs/System.js';
import type { World } from '../../ecs/World.js';
import type { Entity } from '../../ecs/Entity.js';
import type { EventBus } from '../../events/EventBus.js';
import { SystemEventManager } from '../../events/TypedEventEmitter.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { TVStationComponent as _TVStationComponent } from '../TVStation.js';
import type { TVShowComponent } from '../TVShow.js';
import type { TVContentComponent } from '../TVContent.js';
import type { TVBroadcastComponent, ViewerReaction } from '../TVBroadcasting.js';
import { updateCulturalImpact, renewShow, cancelShow } from '../TVShow.js';
import { updateViewership } from '../TVContent.js';
import { createViewerReaction, recordReaction } from '../TVBroadcasting.js';

/** How often to evaluate show performance (every 10 game minutes) */
const EVALUATION_INTERVAL = 20 * 60 * 10;

/** Minimum episodes before renewal decision */
const MIN_EPISODES_FOR_RENEWAL = 6;

/** Rating threshold for auto-renewal */
const AUTO_RENEW_RATING = 7.5;

/** Rating threshold for cancellation warning */
const CANCELLATION_WARNING_RATING = 4.0;

/** Rating threshold for immediate cancellation */
const IMMEDIATE_CANCEL_RATING = 2.5;

export class TVRatingsSystem implements System {
  readonly id = 'tv_ratings' as const;
  readonly priority = 66; // After broadcasting
  readonly requiredComponents = [ComponentType.TVShow] as const;

  private events!: SystemEventManager;
  private lastEvaluationTick: number = 0;

  /** Track shows on cancellation watch */
  private cancellationWatch: Map<string, number> = new Map(); // showId -> warning count

  initialize(_world: World, eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, this.id);

    // Subscribe to viewer rating events
    this.events.on('tv:viewer:rated', (data) => {
      this.handleViewerRating(data);
    });
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    // Only evaluate periodically
    if (currentTick - this.lastEvaluationTick < EVALUATION_INTERVAL) {
      return;
    }

    this.lastEvaluationTick = currentTick;

    // Group shows by station for evaluation
    const showsByStation = new Map<string, TVShowComponent[]>();

    for (const entity of entities) {
      const show = entity.components.get(ComponentType.TVShow) as TVShowComponent | undefined;
      if (!show) continue;

      const stationShows = showsByStation.get(show.stationId) ?? [];
      stationShows.push(show);
      showsByStation.set(show.stationId, stationShows);

      // Update cultural impact
      updateCulturalImpact(show);
    }

    // Evaluate shows by station
    showsByStation.forEach((shows, stationId) => {
      this.evaluateStationShows(world, stationId, shows);
    });
  }

  /**
   * Handle viewer rating event
   */
  private handleViewerRating(_data: {
    viewerId: string;
    contentId: string;
    showId: string;
    rating: number;
    willWatchNext: boolean;
  }): void {
    // Find content and update viewership
    // This is called from event subscription, so we need to handle async
    // Actual processing happens via processViewerReaction() called directly
  }

  /**
   * Process a viewer's reaction to content
   */
  processViewerReaction(
    world: World,
    viewerId: string,
    contentId: string,
    showId: string,
    rating: number,
    thoughts: string
  ): ViewerReaction {
    const currentTick = world.tick;

    // Create reaction
    const reaction = createViewerReaction(
      viewerId,
      contentId,
      showId,
      rating,
      thoughts,
      currentTick
    );

    // Find content entity and update
    const contentEntity = this.findContentEntity(world, contentId);
    if (contentEntity) {
      const content = contentEntity.components.get(ComponentType.TVContent) as TVContentComponent;
      if (content) {
        updateViewership(content, viewerId, rating);
      }
    }

    // Find broadcast component and record
    const showEntity = this.findShowEntity(world, showId);
    if (showEntity) {
      const show = showEntity.components.get(ComponentType.TVShow) as TVShowComponent;
      if (show) {
        const stationEntity = world.getEntity(show.stationId);
        if (stationEntity) {
          const broadcast = stationEntity.components.get(ComponentType.TVBroadcast) as TVBroadcastComponent;
          if (broadcast) {
            recordReaction(broadcast, reaction);
          }
        }

        // Update show average rating
        this.updateShowRating(show, rating);

        // Check for catchphrase learning
        if (reaction.enjoyed && show.catchphrases.size > 0) {
          this.tryLearnCatchphrase(world, viewerId, show);
        }
      }
    }

    // Emit event
    this.events.emit('tv:viewer:rated', {
      viewerId,
      contentId,
      showId,
      rating,
      willWatchNext: reaction.willWatchNext,
    }, viewerId);

    return reaction;
  }

  /**
   * Evaluate shows for a station
   */
  private evaluateStationShows(
    world: World,
    stationId: string,
    shows: TVShowComponent[]
  ): void {
    for (const show of shows) {
      // Skip shows not in production/airing
      if (show.status !== 'airing' && show.status !== 'in_production') {
        continue;
      }

      // Need minimum episodes for evaluation
      if (show.totalEpisodes < MIN_EPISODES_FOR_RENEWAL) {
        continue;
      }

      this.evaluateShow(world, stationId, show);
    }
  }

  /**
   * Evaluate a single show for renewal/cancellation
   */
  private evaluateShow(
    world: World,
    stationId: string,
    show: TVShowComponent
  ): void {
    const rating = show.averageRating;

    // Auto-renew high performers
    if (rating >= AUTO_RENEW_RATING && show.status === 'airing') {
      if (show.episodesThisSeason >= 10) {
        renewShow(show);
        this.cancellationWatch.delete(show.showId);

        this.events.emit('tv:show:renewed', {
          showId: show.showId,
          stationId,
          newSeason: show.currentSeason,
        }, stationId);
      }
      return;
    }

    // Immediate cancellation for very low ratings
    if (rating <= IMMEDIATE_CANCEL_RATING) {
      this.cancelShowWithEvent(world, stationId, show);
      return;
    }

    // Warning zone
    if (rating <= CANCELLATION_WARNING_RATING) {
      const warningCount = (this.cancellationWatch.get(show.showId) ?? 0) + 1;
      this.cancellationWatch.set(show.showId, warningCount);

      // Cancel after 3 warnings
      if (warningCount >= 3) {
        this.cancelShowWithEvent(world, stationId, show);
      }
      return;
    }

    // Good but not great - clear any warnings
    this.cancellationWatch.delete(show.showId);
  }

  /**
   * Cancel show and emit event
   */
  private cancelShowWithEvent(
    _world: World,
    stationId: string,
    show: TVShowComponent
  ): void {
    cancelShow(show);
    this.cancellationWatch.delete(show.showId);

    this.events.emit('tv:show:cancelled', {
      showId: show.showId,
      stationId,
      finalSeason: show.currentSeason,
      totalEpisodes: show.totalEpisodes,
    }, stationId);
  }

  /**
   * Update show's running average rating
   */
  private updateShowRating(show: TVShowComponent, newRating: number): void {
    // Exponential moving average
    const alpha = 0.1; // Weight for new rating
    if (show.averageRating === 0) {
      show.averageRating = newRating;
    } else {
      show.averageRating = alpha * newRating + (1 - alpha) * show.averageRating;
    }
  }

  /**
   * Try to have viewer learn a catchphrase from show
   */
  private tryLearnCatchphrase(
    _world: World,
    viewerId: string,
    show: TVShowComponent
  ): void {
    // 20% chance to learn a catchphrase when enjoyed
    if (Math.random() > 0.2) return;

    // Pick random catchphrase
    const catchphrases = Array.from(show.catchphrases.entries());
    if (catchphrases.length === 0) return;

    const [characterName, catchphrase] = catchphrases[Math.floor(Math.random() * catchphrases.length)]!;

    // Emit event for memory system to handle
    this.events.emit('tv:catchphrase:learned', {
      viewerId,
      showId: show.showId,
      characterName,
      catchphrase,
    }, viewerId);
  }

  /**
   * Find content entity by content ID
   */
  private findContentEntity(world: World, contentId: string): Entity | null {
    const entities = world.query().with(ComponentType.TVContent).executeEntities();
    for (const entity of entities) {
      const content = entity.components.get(ComponentType.TVContent) as TVContentComponent;
      if (content && content.contentId === contentId) {
        return entity;
      }
    }
    return null;
  }

  /**
   * Find show entity by show ID
   */
  private findShowEntity(world: World, showId: string): Entity | null {
    const entities = world.query().with(ComponentType.TVShow).executeEntities();
    for (const entity of entities) {
      const show = entity.components.get(ComponentType.TVShow) as TVShowComponent;
      if (show && show.showId === showId) {
        return entity;
      }
    }
    return null;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get rating for a show
   */
  getShowRating(world: World, showId: string): number {
    const entity = this.findShowEntity(world, showId);
    if (!entity) return 0;

    const show = entity.components.get(ComponentType.TVShow) as TVShowComponent;
    return show?.averageRating ?? 0;
  }

  /**
   * Get all shows sorted by rating
   */
  getShowsByRating(world: World): Array<{ showId: string; title: string; rating: number }> {
    const shows = world.query().with(ComponentType.TVShow).executeEntities();
    const result: Array<{ showId: string; title: string; rating: number }> = [];

    for (const entity of shows) {
      const show = entity.components.get(ComponentType.TVShow) as TVShowComponent;
      if (show && show.status === 'airing') {
        result.push({
          showId: show.showId,
          title: show.title,
          rating: show.averageRating,
        });
      }
    }

    return result.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get shows on cancellation watch
   */
  getShowsOnWatch(): Map<string, number> {
    return new Map(this.cancellationWatch);
  }

  cleanup(): void {
    this.cancellationWatch.clear();
    this.events.cleanup();
  }
}
