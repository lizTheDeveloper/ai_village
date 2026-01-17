/**
 * TVProductionSystem - Filming and recording
 *
 * Handles:
 * - Scene filming with takes and retakes
 * - Director guidance and actor performance
 * - Location management
 * - Equipment and crew coordination
 * - Live recording for news/talk shows
 */

import type { System } from '../../ecs/System.js';
import type { World } from '../../ecs/World.js';
import type { Entity } from '../../ecs/Entity.js';
import type { EventBus } from '../../events/EventBus.js';
import { SystemEventManager } from '../../events/TypedEventEmitter.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { TVStationComponent, Production } from '../TVStation.js';
import type { TVContentComponent, FilmedTake, FilmedScene } from '../TVContent.js';

/** How often to process filming (every 2 game minutes) */
const FILMING_INTERVAL = 20 * 60 * 2;

/** Ticks to film a single scene */
const SCENE_FILMING_DURATION = 20 * 60 * 15; // 15 game minutes per scene

/** Maximum takes before moving on */
const MAX_TAKES_PER_SCENE = 5;

// ============================================================================
// FILMING TYPES
// ============================================================================

export interface FilmingSession {
  id: string;
  productionId: string;
  showId: string;
  contentId: string;
  currentSceneIndex: number;
  totalScenes: number;
  startedTick: number;
  status: 'setup' | 'filming' | 'between_scenes' | 'wrapped';

  /** Current scene being filmed */
  currentScene?: ActiveScene;

  /** Completed scenes */
  completedScenes: FilmedScene[];

  /** Crew on set */
  director: string;
  actors: string[];
  crew: string[];
}

export interface ActiveScene {
  sceneNumber: number;
  takeNumber: number;
  takes: FilmedTake[];
  startedTick: number;
  location: string;
}

export interface PerformanceRating {
  actorId: string;
  quality: number; // 0-1
  notes: string;
}

// ============================================================================
// SYSTEM
// ============================================================================

export class TVProductionSystem implements System {
  readonly id = 'tv_production' as const;
  readonly priority = 64; // After writing, before post-production
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private events!: SystemEventManager;
  private lastProcessTick: number = 0;

  /** Active filming sessions */
  private filmingSessions: Map<string, FilmingSession> = new Map();

  initialize(_world: World, eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, this.id);
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    // Only process periodically
    if (currentTick - this.lastProcessTick < FILMING_INTERVAL) {
      return;
    }

    this.lastProcessTick = currentTick;

    // Process active filming sessions
    this.processFilmingSessions(world, currentTick);

    // Check for productions ready to film
    for (const entity of entities) {
      const station = entity.components.get(ComponentType.TVStation) as TVStationComponent | undefined;
      if (!station) continue;

      this.checkProductionsForFilming(world, station, currentTick);
    }
  }

  // ============================================================================
  // FILMING SESSIONS
  // ============================================================================

  /**
   * Process active filming sessions
   */
  private processFilmingSessions(world: World, currentTick: number): void {
    this.filmingSessions.forEach((session, _sessionId) => {
      if (session.status === 'wrapped') return;

      this.updateFilmingSession(world, session, currentTick);
    });
  }

  /**
   * Update a single filming session
   */
  private updateFilmingSession(
    world: World,
    session: FilmingSession,
    currentTick: number
  ): void {
    switch (session.status) {
      case 'setup':
        this.handleSetup(world, session, currentTick);
        break;

      case 'filming':
        this.handleFilming(world, session, currentTick);
        break;

      case 'between_scenes':
        this.handleBetweenScenes(world, session, currentTick);
        break;
    }
  }

  /**
   * Handle setup phase
   */
  private handleSetup(
    _world: World,
    session: FilmingSession,
    currentTick: number
  ): void {
    // Setup takes a few minutes
    const setupDuration = 20 * 60 * 5; // 5 game minutes
    if (currentTick - session.startedTick >= setupDuration) {
      session.status = 'filming';
      this.startScene(session, currentTick);

      this.events.emitGeneric('tv:production:filming_started', {
        sessionId: session.id,
        showId: session.showId,
        contentId: session.contentId,
        totalScenes: session.totalScenes,
      }, session.showId);
    }
  }

  /**
   * Handle active filming
   */
  private handleFilming(
    world: World,
    session: FilmingSession,
    currentTick: number
  ): void {
    if (!session.currentScene) return;

    // Check if current take is complete
    const takeDuration = SCENE_FILMING_DURATION / MAX_TAKES_PER_SCENE;
    const takeElapsed = currentTick - session.currentScene.startedTick;

    if (takeElapsed >= takeDuration * session.currentScene.takeNumber) {
      // Complete this take
      this.completeTake(world, session, currentTick);
    }
  }

  /**
   * Handle between scenes
   */
  private handleBetweenScenes(
    _world: World,
    session: FilmingSession,
    currentTick: number
  ): void {
    // Brief break between scenes
    const breakDuration = 20 * 60 * 2; // 2 game minutes
    if (session.currentScene && currentTick - session.currentScene.startedTick >= breakDuration) {
      if (session.currentSceneIndex < session.totalScenes - 1) {
        session.currentSceneIndex++;
        session.status = 'filming';
        this.startScene(session, currentTick);
      } else {
        // All scenes complete
        this.wrapSession(session, currentTick);
      }
    }
  }

  /**
   * Start filming a scene
   */
  private startScene(session: FilmingSession, currentTick: number): void {
    session.currentScene = {
      sceneNumber: session.currentSceneIndex + 1,
      takeNumber: 1,
      takes: [],
      startedTick: currentTick,
      location: `Set ${session.currentSceneIndex + 1}`,
    };

    this.events.emitGeneric('tv:production:scene_started', {
      sessionId: session.id,
      sceneNumber: session.currentScene.sceneNumber,
      location: session.currentScene.location,
    }, session.showId);
  }

  /**
   * Complete a take
   */
  private completeTake(
    world: World,
    session: FilmingSession,
    currentTick: number
  ): void {
    if (!session.currentScene) return;

    // Calculate take quality based on various factors
    const quality = this.calculateTakeQuality(world, session);

    const take: FilmedTake = {
      takeNumber: session.currentScene.takeNumber,
      sceneNumber: session.currentScene.sceneNumber,
      performance: this.generatePerformanceDescription(quality),
      quality,
      directorNotes: this.generateDirectorNotes(quality),
      timestamp: currentTick,
    };

    session.currentScene.takes.push(take);

    this.events.emitGeneric('tv:production:take_completed', {
      sessionId: session.id,
      sceneNumber: session.currentScene.sceneNumber,
      takeNumber: take.takeNumber,
      quality: take.quality,
    }, session.showId);

    // Decide whether to do another take or move on
    const shouldRetake = quality < 0.7 && session.currentScene.takeNumber < MAX_TAKES_PER_SCENE;

    if (shouldRetake) {
      session.currentScene.takeNumber++;
      session.currentScene.startedTick = currentTick;
    } else {
      // Scene complete - pick best take
      this.completeScene(session, currentTick);
    }
  }

  /**
   * Complete filming of a scene
   */
  private completeScene(session: FilmingSession, currentTick: number): void {
    if (!session.currentScene) return;

    // Find best take
    const bestTake = session.currentScene.takes.reduce((best, take) =>
      take.quality > best.quality ? take : best
    );

    const filmedScene: FilmedScene = {
      sceneId: session.currentScene.sceneNumber,
      bestTake,
      allTakes: session.currentScene.takes,
      editedQuality: bestTake.quality, // Will be adjusted in post-production
    };

    session.completedScenes.push(filmedScene);

    this.events.emitGeneric('tv:production:scene_completed', {
      sessionId: session.id,
      sceneNumber: session.currentScene.sceneNumber,
      bestTakeNumber: bestTake.takeNumber,
      quality: bestTake.quality,
      totalTakes: session.currentScene.takes.length,
    }, session.showId);

    // Move to between scenes
    session.status = 'between_scenes';
    session.currentScene.startedTick = currentTick;
  }

  /**
   * Wrap the filming session
   */
  private wrapSession(session: FilmingSession, currentTick: number): void {
    session.status = 'wrapped';

    // Calculate overall quality
    const avgQuality = session.completedScenes.reduce((sum, s) => sum + s.bestTake.quality, 0) /
      session.completedScenes.length;

    this.events.emitGeneric('tv:production:wrapped', {
      sessionId: session.id,
      showId: session.showId,
      contentId: session.contentId,
      scenesFilmed: session.completedScenes.length,
      averageQuality: avgQuality,
      totalTick: currentTick - session.startedTick,
    }, session.showId);

    // Update production phase
    this.advanceToPostProduction(session);
  }

  /**
   * Advance production to post-production phase
   */
  private advanceToPostProduction(session: FilmingSession): void {
    // This would update the Production in TVStationComponent
    // For now, emit an event for other systems to handle
    this.events.emitGeneric('tv:production:ready_for_post', {
      contentId: session.contentId,
      filmedScenes: session.completedScenes,
    }, session.showId);
  }

  // ============================================================================
  // QUALITY CALCULATIONS
  // ============================================================================

  /**
   * Calculate quality of a take
   */
  private calculateTakeQuality(_world: World, session: FilmingSession): number {
    // Base quality from random performance
    let quality = 0.5 + Math.random() * 0.3;

    // Actor skill bonus (would query agent skills)
    const actorBonus = 0.1 * Math.random();
    quality += actorBonus;

    // Director experience bonus
    const directorBonus = 0.1 * Math.random();
    quality += directorBonus;

    // Equipment quality bonus
    const equipmentBonus = 0.05;
    quality += equipmentBonus;

    // Take number bonus (actors warm up)
    if (session.currentScene) {
      const takeBonus = Math.min(0.1, session.currentScene.takeNumber * 0.02);
      quality += takeBonus;
    }

    // Clamp to 0-1
    return Math.min(1, Math.max(0, quality));
  }

  /**
   * Generate performance description
   */
  private generatePerformanceDescription(quality: number): string {
    if (quality >= 0.9) return 'Outstanding performance with natural emotion and perfect timing.';
    if (quality >= 0.8) return 'Strong performance with good chemistry and clear delivery.';
    if (quality >= 0.7) return 'Solid performance that captures the scene well.';
    if (quality >= 0.6) return 'Adequate performance with minor issues.';
    if (quality >= 0.5) return 'Passable performance but lacking energy.';
    return 'Weak performance with noticeable problems.';
  }

  /**
   * Generate director notes
   */
  private generateDirectorNotes(quality: number): string {
    if (quality >= 0.9) return 'Print it! Perfect take.';
    if (quality >= 0.8) return 'Good energy. Minor adjustments needed in edit.';
    if (quality >= 0.7) return 'Usable. Watch the pacing in the middle.';
    if (quality >= 0.6) return 'Need more emotion in the delivery.';
    if (quality >= 0.5) return 'Let\'s try again with more energy.';
    return 'Reset. Take it from the top.';
  }

  // ============================================================================
  // PRODUCTION MANAGEMENT
  // ============================================================================

  /**
   * Check productions ready for filming
   */
  private checkProductionsForFilming(
    world: World,
    station: TVStationComponent,
    currentTick: number
  ): void {
    for (const production of station.activeProductions) {
      if (production.phase !== 'production') continue;

      // Check if already filming
      const hasSession = Array.from(this.filmingSessions.values())
        .some(s => s.contentId === production.contentId && s.status !== 'wrapped');

      if (!hasSession) {
        this.startFilmingSession(world, station, production, currentTick);
      }
    }
  }

  /**
   * Start a new filming session
   */
  startFilmingSession(
    world: World,
    station: TVStationComponent,
    production: Production,
    currentTick: number
  ): FilmingSession | null {
    // Find the content
    const contentEntity = this.findContentEntity(world, production.contentId);
    if (!contentEntity) return null;

    const content = contentEntity.components.get(ComponentType.TVContent) as TVContentComponent;
    if (!content || !content.script) return null;

    // Count scenes
    const totalScenes = content.script.acts.reduce((sum, act) => sum + act.scenes.length, 0);
    if (totalScenes === 0) return null;

    // Get crew from production crew Map
    const director = production.crew.get('director')?.[0] ?? 'unknown_director';
    const actors = production.crew.get('actor') ?? [];
    const otherCrew: string[] = [];
    production.crew.forEach((agentIds, role) => {
      if (role !== 'director' && role !== 'actor') {
        otherCrew.push(...agentIds);
      }
    });

    const session: FilmingSession = {
      id: `filming_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productionId: production.id,
      showId: production.showId,
      contentId: production.contentId,
      currentSceneIndex: 0,
      totalScenes,
      startedTick: currentTick,
      status: 'setup',
      completedScenes: [],
      director,
      actors,
      crew: otherCrew,
    };

    this.filmingSessions.set(session.id, session);

    this.events.emitGeneric('tv:production:session_created', {
      sessionId: session.id,
      showId: production.showId,
      contentId: production.contentId,
      director,
      actorCount: actors.length,
      crewCount: otherCrew.length,
    }, station.buildingId);

    return session;
  }

  // ============================================================================
  // LIVE PRODUCTION
  // ============================================================================

  /**
   * Start a live recording session (for news, talk shows)
   */
  startLiveRecording(
    _world: World,
    stationId: string,
    showId: string,
    contentId: string,
    currentTick: number
  ): FilmingSession | null {
    const session: FilmingSession = {
      id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productionId: 'live',
      showId,
      contentId,
      currentSceneIndex: 0,
      totalScenes: 1, // Live is one continuous scene
      startedTick: currentTick,
      status: 'filming',
      completedScenes: [],
      director: 'live_director',
      actors: [],
      crew: [],
    };

    this.filmingSessions.set(session.id, session);

    this.events.emitGeneric('tv:production:live_started', {
      sessionId: session.id,
      showId,
      contentId,
    }, stationId);

    return session;
  }

  /**
   * End a live recording
   */
  endLiveRecording(sessionId: string, currentTick: number): void {
    const session = this.filmingSessions.get(sessionId);
    if (!session) return;

    // Create a single "scene" for the live recording
    const filmedScene: FilmedScene = {
      sceneId: 1,
      bestTake: {
        takeNumber: 1,
        sceneNumber: 1,
        performance: 'Live broadcast',
        quality: 0.8 + Math.random() * 0.2, // Live is generally good quality
        directorNotes: 'Live recording completed.',
        timestamp: currentTick,
      },
      allTakes: [],
      editedQuality: 0.85,
    };

    session.completedScenes.push(filmedScene);
    session.status = 'wrapped';

    this.eventBus?.emit({
      type: 'tv:production:live_ended' as any,
      source: session.showId,
      data: {
        sessionId: session.id,
        showId: session.showId,
        contentId: session.contentId,
        duration: currentTick - session.startedTick,
      },
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

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

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get active filming sessions for a show
   */
  getShowSessions(showId: string): FilmingSession[] {
    return Array.from(this.filmingSessions.values())
      .filter(s => s.showId === showId);
  }

  /**
   * Get current session status
   */
  getSessionStatus(sessionId: string): FilmingSession | null {
    return this.filmingSessions.get(sessionId) ?? null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): FilmingSession[] {
    return Array.from(this.filmingSessions.values())
      .filter(s => s.status !== 'wrapped');
  }

  cleanup(): void {
    this.filmingSessions.clear();
    this.eventBus = null;
  }
}
