/**
 * TVWritingSystem - Script generation and story arcs
 *
 * Handles:
 * - Script writing for episodes
 * - Story arc management (episodic vs serialized)
 * - Character development tracking
 * - Table reads and revisions
 * - Integration with ScriptGenerator for LLM-powered content
 */

import type { System } from '../../ecs/System.js';
import type { World } from '../../ecs/World.js';
import type { Entity } from '../../ecs/Entity.js';
import type { EventBus } from '../../events/EventBus.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { TVStationComponent } from '../TVStation.js';
import type { TVShowComponent, Storyline, PlotTwist } from '../TVShow.js';
import type { TVContentComponent } from '../TVContent.js';
import { createTVScript } from '../TVContent.js';
import { createStoryline, createPlotTwist } from '../TVShow.js';
import { advanceProductionPhase } from '../TVStation.js';
import type { ScriptGenerationRequest, ScriptGenerationResult } from '../generation/ScriptGenerator.js';

/** How often to process writing tasks (every 2 game minutes) */
const WRITING_INTERVAL = 20 * 60 * 2;

/** Ticks for a writer to complete a script draft */
const DRAFT_DURATION = 20 * 60 * 30; // 30 game minutes

/** Ticks for a revision pass */
const REVISION_DURATION = 20 * 60 * 10; // 10 game minutes

// ============================================================================
// WRITING TASK TYPES
// ============================================================================

export interface WritingTask {
  id: string;
  type: 'draft' | 'revision' | 'table_read';
  showId: string;
  contentId: string;
  scriptId: string;
  writerId: string;
  startedTick: number;
  estimatedCompletionTick: number;
  status: 'in_progress' | 'completed' | 'blocked';
}

export interface EpisodePlan {
  showId: string;
  season: number;
  episode: number;
  title: string;
  synopsis: string;
  mainPlot: string;
  subPlots: string[];
  focusCharacters: string[];
  emotionalArc: string;
  cliffhanger?: string;
}

// ============================================================================
// SYSTEM
// ============================================================================

export class TVWritingSystem implements System {
  readonly id = 'tv_writing' as const;
  readonly priority = 63; // After development
  readonly requiredComponents = [ComponentType.TVShow] as const;

  private eventBus: EventBus | null = null;
  private lastProcessTick: number = 0;

  /** Active writing tasks */
  private activeTasks: Map<string, WritingTask> = new Map();

  /** Script generation callback (set by ScriptGenerator) */
  private scriptGenerator: ((req: ScriptGenerationRequest) => Promise<ScriptGenerationResult>) | null = null;

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Register the script generator
   */
  setScriptGenerator(generator: (req: ScriptGenerationRequest) => Promise<ScriptGenerationResult>): void {
    this.scriptGenerator = generator;
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    // Only process periodically
    if (currentTick - this.lastProcessTick < WRITING_INTERVAL) {
      return;
    }

    this.lastProcessTick = currentTick;

    // Process active writing tasks
    this.processWritingTasks(world, currentTick);

    // Check for shows needing new scripts
    for (const entity of entities) {
      const show = entity.components.get(ComponentType.TVShow) as TVShowComponent | undefined;
      if (!show) continue;

      if (show.status === 'in_production' || show.status === 'airing') {
        this.checkScriptNeeds(world, show, currentTick);
      }
    }
  }

  // ============================================================================
  // WRITING TASKS
  // ============================================================================

  /**
   * Process active writing tasks
   */
  private processWritingTasks(world: World, currentTick: number): void {
    this.activeTasks.forEach((task, _taskId) => {
      if (task.status !== 'in_progress') return;

      if (currentTick >= task.estimatedCompletionTick) {
        this.completeWritingTask(world, task, currentTick);
      }
    });
  }

  /**
   * Complete a writing task
   */
  private completeWritingTask(
    world: World,
    task: WritingTask,
    _currentTick: number
  ): void {
    task.status = 'completed';

    // Find content entity
    const contentEntity = this.findContentEntity(world, task.contentId);
    if (!contentEntity) {
      this.activeTasks.delete(task.id);
      return;
    }

    const content = contentEntity.components.get(ComponentType.TVContent) as TVContentComponent;
    if (!content || !content.script) {
      this.activeTasks.delete(task.id);
      return;
    }

    switch (task.type) {
      case 'draft':
        content.script.productionStatus = 'draft';
        content.script.revisions = 0;
        this.eventBus?.emit({
          type: 'tv:script:draft_completed' as any,
          source: task.writerId,
          data: {
            scriptId: task.scriptId,
            showId: task.showId,
            writerId: task.writerId,
          },
        });
        break;

      case 'revision':
        content.script.revisions++;
        if (content.script.revisions >= 2) {
          content.script.productionStatus = 'table_read';
        }
        this.eventBus?.emit({
          type: 'tv:script:revised' as any,
          source: task.writerId,
          data: {
            scriptId: task.scriptId,
            showId: task.showId,
            revisionNumber: content.script.revisions,
          },
        });
        break;

      case 'table_read':
        content.script.productionStatus = 'shooting';

        // Move production to next phase
        const show = this.findShow(world, task.showId);
        if (show) {
          const station = world.getEntity(show.stationId);
          if (station) {
            const stationComp = station.components.get(ComponentType.TVStation) as TVStationComponent;
            if (stationComp) {
              const production = stationComp.activeProductions.find(p => p.contentId === task.contentId);
              if (production) {
                advanceProductionPhase(production);
              }
            }
          }
        }

        this.eventBus?.emit({
          type: 'tv:script:ready_to_film' as any,
          source: task.showId,
          data: {
            scriptId: task.scriptId,
            showId: task.showId,
            contentId: task.contentId,
          },
        });
        break;
    }

    this.activeTasks.delete(task.id);
  }

  // ============================================================================
  // SCRIPT CREATION
  // ============================================================================

  /**
   * Check if a show needs new scripts
   */
  private checkScriptNeeds(
    world: World,
    show: TVShowComponent,
    currentTick: number
  ): void {
    // Find station
    const stationEntity = world.getEntity(show.stationId);
    if (!stationEntity) return;

    const station = stationEntity.components.get(ComponentType.TVStation) as TVStationComponent;
    if (!station) return;

    // Check productions in development phase
    for (const production of station.activeProductions) {
      if (production.showId !== show.showId) continue;
      if (production.phase !== 'development') continue;

      // Check if already has writing task
      const hasTask = Array.from(this.activeTasks.values())
        .some(t => t.contentId === production.contentId && t.status === 'in_progress');

      if (!hasTask) {
        // Find a writer
        const writer = this.findAvailableWriter(show, station);
        if (writer) {
          this.startWritingTask(world, show, production.contentId, writer, currentTick);
        }
      }
    }
  }

  /**
   * Start a writing task for an episode
   */
  startWritingTask(
    world: World,
    show: TVShowComponent,
    contentId: string,
    writerId: string,
    currentTick: number
  ): WritingTask | null {
    // Find content
    const contentEntity = this.findContentEntity(world, contentId);
    if (!contentEntity) return null;

    const content = contentEntity.components.get(ComponentType.TVContent) as TVContentComponent;
    if (!content) return null;

    // Determine task type based on script status
    let taskType: WritingTask['type'] = 'draft';
    let duration = DRAFT_DURATION;

    if (content.script) {
      if (content.script.productionStatus === 'draft') {
        taskType = 'revision';
        duration = REVISION_DURATION;
      } else if (content.script.productionStatus === 'table_read') {
        taskType = 'table_read';
        duration = REVISION_DURATION;
      }
    } else {
      // Create initial script
      const script = createTVScript(
        show.showId,
        content.season ?? 1,
        content.episodeNumber ?? 1,
        content.title,
        [writerId],
        currentTick
      );

      // Generate episode plan
      const plan = this.generateEpisodePlan(show, content.season ?? 1, content.episodeNumber ?? 1);
      script.logline = plan.synopsis;
      script.synopsis = plan.mainPlot;

      content.script = script;
    }

    // Create task
    const task: WritingTask = {
      id: `writing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: taskType,
      showId: show.showId,
      contentId,
      scriptId: content.script!.id,
      writerId,
      startedTick: currentTick,
      estimatedCompletionTick: currentTick + duration,
      status: 'in_progress',
    };

    this.activeTasks.set(task.id, task);

    // If we have a script generator, use it
    if (this.scriptGenerator && taskType === 'draft') {
      this.generateScriptContent(show, content, task);
    }

    return task;
  }

  /**
   * Generate episode plan based on show structure
   */
  private generateEpisodePlan(
    show: TVShowComponent,
    season: number,
    episode: number
  ): EpisodePlan {
    const isPilot = season === 1 && episode === 1;
    const isFinale = episode >= 10; // Assume 10 episode seasons

    // Pick focus characters
    const leads = show.characters.filter(c =>
      show.cast.find(m => m.characterName === c.name && m.role === 'lead')
    );
    const focusCharacters = leads.slice(0, 2).map(c => c.name);

    // Generate emotional arc based on episode position
    let emotionalArc = 'rising action';
    if (isPilot) emotionalArc = 'introduction and hook';
    if (isFinale) emotionalArc = 'climax and resolution';
    if (episode === 5) emotionalArc = 'midpoint twist';

    // Check for active storylines
    const activeStorylines = show.storylines.filter(s => s.status === 'ongoing');
    const mainPlot = activeStorylines[0]?.plot ?? show.premise;
    const subPlots = activeStorylines.slice(1, 3).map(s => s.title);

    return {
      showId: show.showId,
      season,
      episode,
      title: `Episode ${episode}`,
      synopsis: `${show.title} S${season}E${episode}`,
      mainPlot,
      subPlots,
      focusCharacters,
      emotionalArc,
      cliffhanger: isFinale ? 'Season finale cliffhanger' : undefined,
    };
  }

  /**
   * Generate script content using LLM
   */
  private async generateScriptContent(
    show: TVShowComponent,
    content: TVContentComponent,
    _task: WritingTask
  ): Promise<void> {
    if (!this.scriptGenerator || !content.script) return;

    try {
      const result = await this.scriptGenerator({
        showId: show.showId,
        showTitle: show.title,
        format: show.format,
        premise: show.premise,
        tone: show.showBible.tone ? [show.showBible.tone] : [],
        characters: show.characters.map(c => ({
          name: c.name,
          personality: c.personality,
          catchphrases: c.catchphrases,
        })),
        season: content.season ?? 1,
        episode: content.episodeNumber ?? 1,
        episodeTitle: content.title,
        storylines: show.storylines.filter(s => s.status === 'ongoing'),
        previousEpisodeSummary: '', // Would need episode history
      });

      if (result.success && content.script) {
        content.script.logline = result.logline ?? content.script.logline;
        content.script.synopsis = result.synopsis ?? content.script.synopsis;
        content.script.acts = result.acts ?? content.script.acts;
      }
    } catch (error) {
      // Script generation failed - continue with placeholder
      console.error(`[TVWritingSystem] Script generation failed: ${error}`);
    }
  }

  // ============================================================================
  // STORYLINE MANAGEMENT
  // ============================================================================

  /**
   * Start a new storyline for a show
   */
  startStoryline(
    world: World,
    showId: string,
    title: string,
    plot: string,
    characters: string[],
    themes: Storyline['themes'],
    expectedDuration: number
  ): Storyline | null {
    const show = this.findShow(world, showId);
    if (!show) return null;

    const storyline = createStoryline(
      title,
      characters,
      plot,
      themes,
      show.totalEpisodes + 1,
      expectedDuration
    );

    show.storylines.push(storyline);

    this.eventBus?.emit({
      type: 'tv:storyline:started' as any,
      source: showId,
      data: {
        showId,
        storylineId: storyline.id,
        title,
        characters,
      },
    });

    return storyline;
  }

  /**
   * Resolve a storyline
   */
  resolveStoryline(
    world: World,
    showId: string,
    storylineId: string,
    resolution: 'resolved' | 'cliffhanger'
  ): boolean {
    const show = this.findShow(world, showId);
    if (!show) return false;

    const storyline = show.storylines.find(s => s.id === storylineId);
    if (!storyline) return false;

    storyline.status = resolution;

    this.eventBus?.emit({
      type: 'tv:storyline:ended' as any,
      source: showId,
      data: {
        showId,
        storylineId,
        resolution,
      },
    });

    return true;
  }

  /**
   * Schedule a plot twist
   */
  schedulePlotTwist(
    world: World,
    showId: string,
    type: PlotTwist['type'],
    affectedCharacters: string[],
    impact: PlotTwist['impact'],
    episodeNumber: number
  ): PlotTwist | null {
    const show = this.findShow(world, showId);
    if (!show) return null;

    const twist = createPlotTwist(type, affectedCharacters, impact, episodeNumber);
    show.upcomingTwists.push(twist);

    return twist;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private findAvailableWriter(show: TVShowComponent, station: TVStationComponent): string | null {
    // First try show's assigned writers
    for (const writerId of show.writers) {
      const hasTask = Array.from(this.activeTasks.values())
        .some(t => t.writerId === writerId && t.status === 'in_progress');
      if (!hasTask) return writerId;
    }

    // Fall back to station writers
    const stationWriters = station.employees.filter(e => e.role === 'writer');
    for (const writer of stationWriters) {
      const hasTask = Array.from(this.activeTasks.values())
        .some(t => t.writerId === writer.agentId && t.status === 'in_progress');
      if (!hasTask) return writer.agentId;
    }

    return null;
  }

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

  private findShow(world: World, showId: string): TVShowComponent | null {
    const entities = world.query().with(ComponentType.TVShow).executeEntities();
    for (const entity of entities) {
      const show = entity.components.get(ComponentType.TVShow) as TVShowComponent;
      if (show && show.showId === showId) {
        return show;
      }
    }
    return null;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get active writing tasks for a show
   */
  getShowWritingTasks(showId: string): WritingTask[] {
    return Array.from(this.activeTasks.values())
      .filter(t => t.showId === showId);
  }

  /**
   * Get a writer's active tasks
   */
  getWriterTasks(writerId: string): WritingTask[] {
    return Array.from(this.activeTasks.values())
      .filter(t => t.writerId === writerId);
  }

  cleanup(): void {
    this.activeTasks.clear();
    this.scriptGenerator = null;
    this.eventBus = null;
  }
}
