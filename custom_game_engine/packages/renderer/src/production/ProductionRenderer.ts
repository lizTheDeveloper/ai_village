/**
 * ProductionRenderer - High-quality character rendering for TV, movies, and media
 *
 * Separate from real-time gameplay rendering, this system generates high-quality
 * character sprites for use in TV shows, gladiator arenas, and inter-dimensional cable.
 */

import type { Entity, World } from '@ai-village/core';

/** Production quality levels */
export enum QualityLevel {
  Broadcast = 1, // 128×128 - Standard TV
  Premium = 2, // 256×256 - High-budget TV, gladiator profiles
  Cinematic = 3, // 512×512 - Movies, epic moments
  Ultra = 4, // 1024×1024+ - Marketing, concept art
}

/** Render format types */
export type RenderFormat = 'sprite' | 'portrait' | 'action' | 'scene';

/** Director types */
export type DirectorType = 'tv' | 'movie' | 'arena' | 'cable' | 'advertising';

/** Costume specifications */
export interface CostumeSpec {
  costumeType:
    | 'peasant'
    | 'common'
    | 'merchant'
    | 'noble'
    | 'royal'
    | 'gladiator'
    | 'performer'
    | 'custom';
  customDescription?: string; // For custom costumes
  colors?: string[]; // Color scheme
  accessories?: string[]; // 'crown', 'sword', 'shield', 'cape', etc.
}

/** Equipment specifications */
export interface EquipmentSpec {
  itemType: 'weapon' | 'shield' | 'tool' | 'prop';
  itemName: string;
  itemDescription?: string;
  inHand: 'left' | 'right' | 'both' | 'sheathed';
}

/** Makeup and effects */
export interface MakeupSpec {
  style: 'natural' | 'stage' | 'dramatic' | 'fantasy';
  effects?: string[]; // 'war_paint', 'scars', 'tattoos', 'glitter'
}

/** Production render request */
export interface RenderRequest {
  // Subject to render
  entityId: string; // The agent/creature to render

  // Production specifications
  qualityLevel: QualityLevel;
  format: RenderFormat;

  // Costuming & styling (applied before render)
  costume?: CostumeSpec;
  equipment?: EquipmentSpec[];
  makeup?: MakeupSpec;

  // Direction
  pose?: string; // 'standing', 'action', 'dramatic', 'portrait'
  expression?: string; // 'neutral', 'angry', 'joyful', 'determined'
  lighting?: 'natural' | 'dramatic' | 'soft' | 'harsh';

  // Animation (optional)
  animation?: string; // 'idle', 'walking', 'fighting', 'speaking'
  frameCount?: number; // For animated sequences

  // Context
  purpose: string; // 'tv_episode_intro', 'gladiator_profile', 'news_segment'
  deadline?: number; // Unix timestamp (optional rush request)
  budget?: number; // Higher budget = better quality/faster turnaround
}

/** Render job status */
export type JobStatus =
  | 'queued'
  | 'concept_art'
  | 'awaiting_approval'
  | 'rendering'
  | 'complete'
  | 'cancelled'
  | 'failed';

/** Concept art for director review */
export interface ConceptArt {
  imageUrl: string; // Low-res preview
  imageData?: string; // Base64 image data
  resolution: string; // e.g., "64x64" or "128x128"
  approved: boolean;
  directorFeedback?: string;
  revisionCount: number;
}

/** Final rendered asset */
export interface RenderedAsset {
  assetId: string;
  imageUrl: string; // High-res final render
  imageData?: string; // Base64 image data
  resolution: string; // e.g., "256x256" or "512x512"
  format: 'png' | 'sprite_sheet';

  // Metadata
  characterId: string;
  costume?: CostumeSpec;
  equipment?: EquipmentSpec[];

  // Animation data (if applicable)
  animationFrames?: string[]; // URLs to frame images
  frameRate?: number; // FPS

  // Usage rights
  licensedTo: string; // Production company
  purpose: string; // What it's for
}

/** Render job tracking */
export interface RenderJob {
  jobId: string;
  status: JobStatus;

  // Request details
  directorId: string;
  request: RenderRequest;

  // Progress
  conceptArt?: ConceptArt;
  finalRender?: RenderedAsset;

  // Timing
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
  estimatedCompletion?: number;

  // Quality metrics
  renderQuality?: number; // 0-100
  directorNotes?: string[];

  // Error tracking
  error?: string;
}

/** Production prompt for AI generation */
export interface ProductionPrompt {
  // Base character
  species: string;
  gender?: string;
  bodyType: string;

  // Appearance
  hairColor?: string;
  skinTone?: string;
  eyeColor?: string;
  facialFeatures?: string;

  // Costuming & equipment
  costume: string; // Full description
  equipment: string[]; // Item descriptions
  accessories: string[];

  // Direction
  pose: string;
  expression: string;
  lighting: string;

  // Quality directives
  detailLevel: 'high detail' | 'highly detailed';
  shading: 'detailed shading' | 'highly detailed shading';
  resolution: number; // Target size in pixels

  // Style consistency
  styleReference?: string; // Reference to production's visual style
}

/** Director interface for requesting renders */
export interface ProductionDirector {
  // Director metadata
  directorId: string;
  directorType: DirectorType;
  productionCompany: string;

  // Production request
  requestRender(request: RenderRequest): Promise<RenderJob>;

  // Review concept art before final render
  reviewConceptArt(jobId: string): Promise<ConceptArt | null>;

  // Approve or request changes
  approveRender(jobId: string, approved: boolean, notes?: string): Promise<void>;

  // Get job status
  getJob(jobId: string): Promise<RenderJob | null>;

  // List director's jobs
  listJobs(filter?: { status?: JobStatus; purpose?: string }): Promise<RenderJob[]>;
}

/**
 * Main production renderer service
 */
export class ProductionRenderer {
  private jobs = new Map<string, RenderJob>();
  private directors = new Map<string, ProductionDirector>();

  constructor(private world: World) {}

  /**
   * Register a director (TV director, movie director, etc.)
   */
  registerDirector(
    directorId: string,
    directorType: DirectorType,
    productionCompany: string
  ): ProductionDirector {
    const director: ProductionDirector = {
      directorId,
      directorType,
      productionCompany,

      requestRender: async (request: RenderRequest) => {
        return this.queueRenderJob(directorId, request);
      },

      reviewConceptArt: async (jobId: string) => {
        const job = this.jobs.get(jobId);
        return job?.conceptArt ?? null;
      },

      approveRender: async (jobId: string, approved: boolean, notes?: string) => {
        const job = this.jobs.get(jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);

        if (job.conceptArt) {
          job.conceptArt.approved = approved;
          job.conceptArt.directorFeedback = notes;
        }

        if (approved) {
          job.status = 'rendering';
          // Kick off final render
          await this.renderFinal(job);
        } else {
          job.status = 'cancelled';
          if (notes) {
            job.directorNotes = job.directorNotes || [];
            job.directorNotes.push(notes);
          }
        }
      },

      getJob: async (jobId: string) => {
        return this.jobs.get(jobId) ?? null;
      },

      listJobs: async (filter?: { status?: JobStatus; purpose?: string }) => {
        const directorJobs = Array.from(this.jobs.values()).filter(
          (job) => job.directorId === directorId
        );

        if (!filter) return directorJobs;

        return directorJobs.filter((job) => {
          if (filter.status && job.status !== filter.status) return false;
          if (filter.purpose && job.request.purpose !== filter.purpose) return false;
          return true;
        });
      },
    };

    this.directors.set(directorId, director);
    return director;
  }

  /**
   * Queue a new render job
   */
  private async queueRenderJob(
    directorId: string,
    request: RenderRequest
  ): Promise<RenderJob> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const job: RenderJob = {
      jobId,
      status: 'queued',
      directorId,
      request,
      queuedAt: Date.now(),
    };

    this.jobs.set(jobId, job);

    // Start with concept art
    this.generateConceptArt(job).catch((error) => {
      job.status = 'failed';
      job.error = error.message;
    });

    return job;
  }

  /**
   * Generate concept art (low-res preview for director approval)
   */
  private async generateConceptArt(job: RenderJob): Promise<void> {
    job.status = 'concept_art';
    job.startedAt = Date.now();

    const entity = this.world.getEntity(job.request.entityId);
    if (!entity) {
      throw new Error(`Entity ${job.request.entityId} not found`);
    }

    // Build production prompt
    const prompt = this.buildProductionPrompt(entity, job.request, 'concept');

    // Generate low-res preview (64×64 or 128×128)
    const conceptResolution = 128;
    const conceptArt = await this.renderCharacter(prompt, conceptResolution);

    job.conceptArt = {
      imageUrl: conceptArt.imageUrl,
      imageData: conceptArt.imageData,
      resolution: `${conceptResolution}x${conceptResolution}`,
      approved: false,
      revisionCount: 0,
    };

    job.status = 'awaiting_approval';
  }

  /**
   * Render final high-quality asset
   */
  private async renderFinal(job: RenderJob): Promise<void> {
    const entity = this.world.getEntity(job.request.entityId);
    if (!entity) {
      throw new Error(`Entity ${job.request.entityId} not found`);
    }

    // Build production prompt
    const prompt = this.buildProductionPrompt(entity, job.request, 'final');

    // Render at target quality level
    const resolution = this.getResolutionForQuality(job.request.qualityLevel);
    const rendered = await this.renderCharacter(prompt, resolution);

    job.finalRender = {
      assetId: `asset_${job.jobId}`,
      imageUrl: rendered.imageUrl,
      imageData: rendered.imageData,
      resolution: `${resolution}x${resolution}`,
      format: 'png',
      characterId: job.request.entityId,
      costume: job.request.costume,
      equipment: job.request.equipment,
      licensedTo: this.directors.get(job.directorId)?.productionCompany ?? 'Unknown',
      purpose: job.request.purpose,
    };

    job.status = 'complete';
    job.completedAt = Date.now();
    job.renderQuality = 95; // TODO: Actual quality assessment
  }

  /**
   * Build production prompt from entity and request
   */
  private buildProductionPrompt(
    entity: Entity,
    request: RenderRequest,
    phase: 'concept' | 'final'
  ): ProductionPrompt {
    // Extract entity traits
    const speciesComp = entity.getComponent('species') as { species?: string } | undefined;
    const genderComp = entity.getComponent('gender') as { gender?: string } | undefined;
    const bodyComp = entity.getComponent('body') as { bodyPlanId?: string } | undefined;
    const genetics = entity.getComponent('genetics') as {
      hair_color?: string;
      skin_tone?: string;
      eye_color?: string;
    } | undefined;
    const species = speciesComp?.species ?? 'human';
    const gender = genderComp?.gender;

    // Derive body type from bodyPlanId (e.g., 'humanoid_standard' -> 'humanoid')
    let bodyType = 'humanoid'; // default
    if (bodyComp?.bodyPlanId) {
      if (bodyComp.bodyPlanId.startsWith('humanoid')) bodyType = 'humanoid';
      else if (bodyComp.bodyPlanId.startsWith('quadruped')) bodyType = 'quadruped';
      else if (bodyComp.bodyPlanId.startsWith('avian')) bodyType = 'avian';
      else if (bodyComp.bodyPlanId.startsWith('insectoid')) bodyType = 'insectoid';
      else if (bodyComp.bodyPlanId.startsWith('serpentine')) bodyType = 'serpentine';
    }

    // Build costume description
    let costumeDesc = 'simple clothing';
    if (request.costume) {
      if (request.costume.costumeType === 'custom' && request.costume.customDescription) {
        costumeDesc = request.costume.customDescription;
      } else {
        costumeDesc = `${request.costume.costumeType} clothing`;
        if (request.costume.colors) {
          costumeDesc += ` in ${request.costume.colors.join(' and ')} colors`;
        }
      }

      if (request.costume.accessories && request.costume.accessories.length > 0) {
        costumeDesc += `, wearing ${request.costume.accessories.join(', ')}`;
      }
    }

    // Build equipment descriptions
    const equipmentDescs: string[] = [];
    if (request.equipment) {
      for (const eq of request.equipment) {
        const desc = eq.itemDescription || eq.itemName;
        equipmentDescs.push(`${desc} in ${eq.inHand} hand`);
      }
    }

    // Determine detail level based on phase and quality
    const detailLevel = phase === 'final' ? 'highly detailed' : 'high detail';
    const shading =
      phase === 'final' ? 'highly detailed shading' : 'detailed shading';

    return {
      species,
      gender,
      bodyType,
      hairColor: genetics?.hair_color,
      skinTone: genetics?.skin_tone,
      eyeColor: genetics?.eye_color,
      costume: costumeDesc,
      equipment: equipmentDescs,
      accessories: request.costume?.accessories ?? [],
      pose: request.pose ?? 'standing',
      expression: request.expression ?? 'neutral',
      lighting: request.lighting ?? 'natural',
      detailLevel,
      shading,
      resolution: this.getResolutionForQuality(request.qualityLevel),
    };
  }

  /**
   * Get resolution for quality level
   */
  private getResolutionForQuality(quality: QualityLevel): number {
    switch (quality) {
      case QualityLevel.Broadcast:
        return 128;
      case QualityLevel.Premium:
        return 256;
      case QualityLevel.Cinematic:
        return 512;
      case QualityLevel.Ultra:
        return 1024;
      default:
        return 256;
    }
  }

  /**
   * Render character using PixelLab or other AI service
   * This is a placeholder - integrate with actual rendering service
   */
  private async renderCharacter(
    prompt: ProductionPrompt,
    resolution: number
  ): Promise<{ imageUrl: string; imageData?: string }> {
    // Build description for PixelLab
    const description = this.buildPixelLabDescription(prompt);


    // TODO: Integrate with PixelLab MCP or other rendering service
    // For now, return placeholder
    return {
      imageUrl: `/assets/productions/placeholder_${resolution}.png`,
      imageData: undefined,
    };
  }

  /**
   * Build description string for PixelLab
   */
  private buildPixelLabDescription(prompt: ProductionPrompt): string {
    const parts: string[] = [];

    // Base character
    if (prompt.gender) {
      parts.push(`${prompt.gender} ${prompt.species}`);
    } else {
      parts.push(prompt.species);
    }

    // Appearance
    if (prompt.hairColor) parts.push(`with ${prompt.hairColor} hair`);
    if (prompt.skinTone) parts.push(`${prompt.skinTone} skin`);

    // Costume
    parts.push(`wearing ${prompt.costume}`);

    // Equipment
    if (prompt.equipment.length > 0) {
      parts.push(`equipped with ${prompt.equipment.join(' and ')}`);
    }

    // Pose and expression
    parts.push(`in ${prompt.pose} pose`);
    parts.push(`${prompt.expression} expression`);

    return parts.join(', ');
  }

  /**
   * Get all jobs (for monitoring/debugging)
   */
  getAllJobs(): RenderJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): RenderJob | null {
    return this.jobs.get(jobId) ?? null;
  }
}
