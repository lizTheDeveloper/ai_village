/**
 * TVPostProductionSystem - Editing and effects
 *
 * Handles:
 * - Video editing (scene assembly, pacing)
 * - Sound design and music scoring
 * - Visual effects
 * - Color grading
 * - Final quality assessment
 * - Content delivery preparation
 */

import type { System } from '../../ecs/System.js';
import type { World } from '../../ecs/World.js';
import type { Entity } from '../../ecs/Entity.js';
import type { EventBus } from '../../events/EventBus.js';
import { SystemEventManager } from '../../events/TypedEventEmitter.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { TVStationComponent, Production } from '../TVStation.js';
import type { TVContentComponent, FilmedScene, EditedEpisode } from '../TVContent.js';

/** How often to process post-production (every 5 game minutes) */
const POST_PRODUCTION_INTERVAL = 20 * 60 * 5;

// ============================================================================
// POST-PRODUCTION TYPES
// ============================================================================

export interface PostProductionJob {
  id: string;
  contentId: string;
  showId: string;
  productionId: string;
  phase: 'editing' | 'sound' | 'vfx' | 'color' | 'final_review' | 'complete';
  startedTick: number;
  phaseStartedTick: number;

  /** Source material */
  filmedScenes: FilmedScene[];

  /** Work in progress */
  editProgress: number; // 0-1
  soundProgress: number;
  vfxProgress: number;
  colorProgress: number;

  /** Assigned crew */
  editor: string;
  soundDesigner?: string;
  vfxArtist?: string;
  colorist?: string;

  /** Quality metrics */
  editingQuality: number;
  soundQuality: number;
  vfxQuality: number;
  colorQuality: number;

  /** Notes and decisions */
  editNotes: string[];
  musicCues: MusicCue[];
  vfxShots: VFXShot[];
}

export interface MusicCue {
  sceneNumber: number;
  timestamp: number;
  cueType: 'underscore' | 'stinger' | 'theme' | 'source';
  mood: string;
  description: string;
}

export interface VFXShot {
  sceneNumber: number;
  shotNumber: number;
  effectType: 'composite' | 'cgi' | 'cleanup' | 'enhancement';
  description: string;
  complexity: 'simple' | 'moderate' | 'complex';
  status: 'pending' | 'in_progress' | 'complete';
}

// ============================================================================
// SYSTEM
// ============================================================================

export class TVPostProductionSystem implements System {
  readonly id = 'tv_post_production' as const;
  readonly priority = 63; // After production
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private events!: SystemEventManager;
  private lastProcessTick: number = 0;

  /** Active post-production jobs */
  private activeJobs: Map<string, PostProductionJob> = new Map();

  /** Phase durations in ticks */
  private readonly phaseDurations = {
    editing: 20 * 60 * 30, // 30 game minutes
    sound: 20 * 60 * 15, // 15 game minutes
    vfx: 20 * 60 * 20, // 20 game minutes
    color: 20 * 60 * 10, // 10 game minutes
    final_review: 20 * 60 * 5, // 5 game minutes
  };

  initialize(_world: World, eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, this.id);

    // Subscribe to production wrap events
    this.events.onGeneric('tv:production:ready_for_post', (_data) => {
      // Would create a new post-production job here
    });
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    // Only process periodically
    if (currentTick - this.lastProcessTick < POST_PRODUCTION_INTERVAL) {
      return;
    }

    this.lastProcessTick = currentTick;

    // Process active jobs
    this.processActiveJobs(world, currentTick);

    // Check for productions in post-production phase
    for (const entity of entities) {
      const station = entity.components.get(ComponentType.TVStation) as TVStationComponent | undefined;
      if (!station) continue;

      this.checkProductionsForPostProduction(world, station, currentTick);
    }
  }

  // ============================================================================
  // JOB PROCESSING
  // ============================================================================

  /**
   * Process all active post-production jobs
   */
  private processActiveJobs(world: World, currentTick: number): void {
    this.activeJobs.forEach((job, _jobId) => {
      if (job.phase === 'complete') return;

      this.processJob(world, job, currentTick);
    });
  }

  /**
   * Process a single post-production job
   */
  private processJob(world: World, job: PostProductionJob, currentTick: number): void {
    const phaseDuration = this.phaseDurations[job.phase as keyof typeof this.phaseDurations];
    if (!phaseDuration) return;

    const phaseElapsed = currentTick - job.phaseStartedTick;
    const progress = Math.min(1, phaseElapsed / phaseDuration);

    switch (job.phase) {
      case 'editing':
        job.editProgress = progress;
        if (progress >= 1) this.completeEditing(job, currentTick);
        break;

      case 'sound':
        job.soundProgress = progress;
        if (progress >= 1) this.completeSound(job, currentTick);
        break;

      case 'vfx':
        job.vfxProgress = progress;
        if (progress >= 1) this.completeVFX(job, currentTick);
        break;

      case 'color':
        job.colorProgress = progress;
        if (progress >= 1) this.completeColor(job, currentTick);
        break;

      case 'final_review':
        if (progress >= 1) this.completeFinalReview(world, job, currentTick);
        break;
    }
  }

  /**
   * Complete editing phase
   */
  private completeEditing(job: PostProductionJob, currentTick: number): void {
    // Calculate editing quality based on editor skill and scene quality
    const sceneAvg = job.filmedScenes.reduce((sum, s) => sum + s.bestTake.quality, 0) /
      Math.max(1, job.filmedScenes.length);
    job.editingQuality = 0.7 + sceneAvg * 0.3;

    job.editNotes.push('Rough cut complete');
    job.editNotes.push('Pacing adjustments made');
    job.editNotes.push('Transitions smoothed');

    this.advancePhase(job, 'sound', currentTick);

    this.events.emitGeneric('tv:postproduction:editing_complete', {
      jobId: job.id,
      contentId: job.contentId,
      quality: job.editingQuality,
    }, job.showId);
  }

  /**
   * Complete sound phase
   */
  private completeSound(job: PostProductionJob, currentTick: number): void {
    // Generate music cues
    job.musicCues = this.generateMusicCues(job.filmedScenes);
    job.soundQuality = 0.75 + Math.random() * 0.2;

    this.advancePhase(job, 'vfx', currentTick);

    this.events.emitGeneric('tv:postproduction:sound_complete', {
      jobId: job.id,
      contentId: job.contentId,
      quality: job.soundQuality,
      musicCues: job.musicCues.length,
    }, job.showId);
  }

  /**
   * Complete VFX phase
   */
  private completeVFX(job: PostProductionJob, currentTick: number): void {
    // Mark all VFX shots complete
    job.vfxShots.forEach(shot => {
      shot.status = 'complete';
    });
    job.vfxQuality = 0.7 + Math.random() * 0.25;

    this.advancePhase(job, 'color', currentTick);

    this.events.emitGeneric('tv:postproduction:vfx_complete', {
      jobId: job.id,
      contentId: job.contentId,
      quality: job.vfxQuality,
      shotsCompleted: job.vfxShots.length,
    }, job.showId);
  }

  /**
   * Complete color phase
   */
  private completeColor(job: PostProductionJob, currentTick: number): void {
    job.colorQuality = 0.8 + Math.random() * 0.15;

    this.advancePhase(job, 'final_review', currentTick);

    this.events.emitGeneric('tv:postproduction:color_complete', {
      jobId: job.id,
      contentId: job.contentId,
      quality: job.colorQuality,
    }, job.showId);
  }

  /**
   * Complete final review
   */
  private completeFinalReview(world: World, job: PostProductionJob, currentTick: number): void {
    job.phase = 'complete';

    // Calculate overall quality
    const overallQuality = (
      job.editingQuality * 0.35 +
      job.soundQuality * 0.25 +
      job.vfxQuality * 0.2 +
      job.colorQuality * 0.2
    );

    // Update content with final episode data
    this.finalizeContent(world, job, overallQuality, currentTick);

    this.events.emitGeneric('tv:postproduction:complete', {
      jobId: job.id,
      contentId: job.contentId,
      showId: job.showId,
      overallQuality,
      editingQuality: job.editingQuality,
      soundQuality: job.soundQuality,
      vfxQuality: job.vfxQuality,
      colorQuality: job.colorQuality,
    }, job.showId);

    // Also emit the episode completed event
    this.events.emit('tv:episode:completed', {
      contentId: job.contentId,
      showId: job.showId,
      season: 1, // Would need to get from content
      episode: 1, // Would need to get from content
      qualityScore: overallQuality,
    }, job.showId);
  }

  /**
   * Advance to next phase
   */
  private advancePhase(
    job: PostProductionJob,
    nextPhase: PostProductionJob['phase'],
    currentTick: number
  ): void {
    job.phase = nextPhase;
    job.phaseStartedTick = currentTick;
  }

  // ============================================================================
  // CONTENT FINALIZATION
  // ============================================================================

  /**
   * Create final edited episode from job
   */
  private finalizeContent(
    world: World,
    job: PostProductionJob,
    overallQuality: number,
    currentTick: number
  ): void {
    // Find content entity
    const contentEntity = this.findContentEntity(world, job.contentId);
    if (!contentEntity) return;

    const content = contentEntity.components.get(ComponentType.TVContent) as TVContentComponent;
    if (!content) return;

    // Update quality scores
    content.qualityScore = overallQuality;
    content.actingScore = job.filmedScenes.reduce((sum, s) => sum + s.bestTake.quality, 0) /
      Math.max(1, job.filmedScenes.length);
    content.writingScore = content.script ? 0.8 : 0.5;
    content.productionScore = (job.soundQuality + job.vfxQuality + job.colorQuality) / 3;

    // Create edited episode
    const editedEpisode: EditedEpisode = {
      id: `edited_${job.contentId}`,
      showId: job.showId,
      season: content.season ?? 1,
      episodeNumber: content.episodeNumber ?? 1,
      title: content.title,
      synopsis: content.script?.synopsis ?? '',
      scenes: job.filmedScenes,
      overallQuality,
      actingQuality: content.actingScore,
      writingQuality: content.writingScore,
      productionQuality: content.productionScore,
      runtime: this.calculateRuntime(job.filmedScenes),
      musicCues: job.musicCues.map(c => c.description),
      colorGrade: this.determineColorGrade(job),
      status: 'ready',
      readyToAirTick: currentTick,
    };

    content.editedEpisode = editedEpisode;
    content.status = 'ready';
  }

  /**
   * Calculate runtime in minutes
   */
  private calculateRuntime(scenes: FilmedScene[]): number {
    // Assume each scene is roughly 3-5 minutes
    return Math.round(scenes.length * (3 + Math.random() * 2));
  }

  /**
   * Determine color grade description
   */
  private determineColorGrade(_job: PostProductionJob): string {
    const grades = [
      'Warm, golden tones',
      'Cool, desaturated look',
      'High contrast with rich blacks',
      'Natural, balanced colors',
      'Vintage film look',
      'Clean, modern aesthetic',
    ];
    return grades[Math.floor(Math.random() * grades.length)]!;
  }

  // ============================================================================
  // MUSIC AND VFX GENERATION
  // ============================================================================

  /**
   * Generate music cues for scenes
   */
  private generateMusicCues(scenes: FilmedScene[]): MusicCue[] {
    const cues: MusicCue[] = [];

    // Opening theme
    cues.push({
      sceneNumber: 1,
      timestamp: 0,
      cueType: 'theme',
      mood: 'establishing',
      description: 'Main title theme',
    });

    // Generate cues for each scene
    scenes.forEach((scene, index) => {
      // Underscore for emotional scenes
      if (scene.bestTake.quality > 0.8) {
        cues.push({
          sceneNumber: scene.sceneId,
          timestamp: index * 180, // Rough 3 min per scene
          cueType: 'underscore',
          mood: this.randomMood(),
          description: `Underscore for scene ${scene.sceneId}`,
        });
      }

      // Stingers for dramatic moments
      if (Math.random() > 0.7) {
        cues.push({
          sceneNumber: scene.sceneId,
          timestamp: index * 180 + 120,
          cueType: 'stinger',
          mood: 'tension',
          description: 'Dramatic stinger',
        });
      }
    });

    // End credits
    cues.push({
      sceneNumber: scenes.length,
      timestamp: scenes.length * 180,
      cueType: 'theme',
      mood: 'closing',
      description: 'End credits theme',
    });

    return cues;
  }

  /**
   * Generate VFX shots list
   */
  generateVFXShots(scenes: FilmedScene[]): VFXShot[] {
    const shots: VFXShot[] = [];

    scenes.forEach((scene, _sceneIndex) => {
      // Basic cleanup for each scene
      shots.push({
        sceneNumber: scene.sceneId,
        shotNumber: 1,
        effectType: 'cleanup',
        description: 'Wire removal and cleanup',
        complexity: 'simple',
        status: 'pending',
      });

      // Random enhancement shots
      if (Math.random() > 0.6) {
        shots.push({
          sceneNumber: scene.sceneId,
          shotNumber: 2,
          effectType: 'enhancement',
          description: 'Sky replacement or background enhancement',
          complexity: 'moderate',
          status: 'pending',
        });
      }

      // Occasional CGI
      if (Math.random() > 0.85) {
        shots.push({
          sceneNumber: scene.sceneId,
          shotNumber: 3,
          effectType: 'cgi',
          description: 'CGI element integration',
          complexity: 'complex',
          status: 'pending',
        });
      }
    });

    return shots;
  }

  private randomMood(): string {
    const moods = ['tension', 'warmth', 'melancholy', 'excitement', 'mystery', 'joy'];
    return moods[Math.floor(Math.random() * moods.length)]!;
  }

  // ============================================================================
  // PRODUCTION MANAGEMENT
  // ============================================================================

  /**
   * Check for productions ready for post-production
   */
  private checkProductionsForPostProduction(
    world: World,
    station: TVStationComponent,
    currentTick: number
  ): void {
    for (const production of station.activeProductions) {
      if (production.phase !== 'post_production') continue;

      // Check if already has a job
      const hasJob = Array.from(this.activeJobs.values())
        .some(j => j.contentId === production.contentId && j.phase !== 'complete');

      if (!hasJob) {
        this.createJob(world, station, production, currentTick);
      }
    }
  }

  /**
   * Create a new post-production job
   */
  createJob(
    world: World,
    station: TVStationComponent,
    production: Production,
    currentTick: number,
    filmedScenes?: FilmedScene[]
  ): PostProductionJob | null {
    // Get filmed scenes from content if not provided
    let scenes = filmedScenes;
    if (!scenes) {
      const contentEntity = this.findContentEntity(world, production.contentId);
      if (!contentEntity) return null;

      const content = contentEntity.components.get(ComponentType.TVContent) as TVContentComponent;
      // Would need filmed scenes from production system
      // For now, create placeholder scenes
      scenes = this.createPlaceholderScenes(content);
    }

    // Get crew from production crew Map
    const editor = production.crew.get('editor')?.[0] ?? 'unknown_editor';
    const soundDesigner = production.crew.get('sound_engineer')?.[0];
    const vfxArtist = undefined; // No VFX role defined - handled by generic crew
    const colorist = undefined; // No colorist role defined - handled by generic crew

    const job: PostProductionJob = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId: production.contentId,
      showId: production.showId,
      productionId: production.id,
      phase: 'editing',
      startedTick: currentTick,
      phaseStartedTick: currentTick,
      filmedScenes: scenes,
      editProgress: 0,
      soundProgress: 0,
      vfxProgress: 0,
      colorProgress: 0,
      editor,
      soundDesigner,
      vfxArtist,
      colorist,
      editingQuality: 0,
      soundQuality: 0,
      vfxQuality: 0,
      colorQuality: 0,
      editNotes: [],
      musicCues: [],
      vfxShots: this.generateVFXShots(scenes),
    };

    this.activeJobs.set(job.id, job);

    this.events.emitGeneric('tv:postproduction:started', {
      jobId: job.id,
      contentId: production.contentId,
      showId: production.showId,
      sceneCount: scenes.length,
    }, station.buildingId);

    return job;
  }

  /**
   * Create placeholder scenes when real footage isn't available
   */
  private createPlaceholderScenes(content: TVContentComponent | null): FilmedScene[] {
    const sceneCount = content?.script?.acts.reduce((sum, act) => sum + act.scenes.length, 0) ?? 5;

    const scenes: FilmedScene[] = [];
    for (let i = 0; i < sceneCount; i++) {
      scenes.push({
        sceneId: i + 1,
        bestTake: {
          takeNumber: 1,
          sceneNumber: i + 1,
          performance: 'Standard performance',
          quality: 0.7 + Math.random() * 0.2,
          directorNotes: 'Good take',
          timestamp: 0,
        },
        allTakes: [],
        editedQuality: 0.75,
      });
    }

    return scenes;
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
   * Get job by content ID
   */
  getJobByContent(contentId: string): PostProductionJob | null {
    for (const job of this.activeJobs.values()) {
      if (job.contentId === contentId) return job;
    }
    return null;
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): PostProductionJob[] {
    return Array.from(this.activeJobs.values())
      .filter(j => j.phase !== 'complete');
  }

  /**
   * Get jobs in a specific phase
   */
  getJobsByPhase(phase: PostProductionJob['phase']): PostProductionJob[] {
    return Array.from(this.activeJobs.values())
      .filter(j => j.phase === phase);
  }

  cleanup(): void {
    this.activeJobs.clear();
    this.events.cleanup();
  }
}
