import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { EntityId } from '../types.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

interface ProductionJob {
  jobId: string;
  type: 'scribe' | 'binding' | 'printing' | 'biography';
  workerId: EntityId;
  workshopId: EntityId;
  progress: number;
  duration: number;
  startTick: number;
  data: {
    sourceBookId?: string;
    manuscriptId?: string;
    subjectId?: EntityId;
    subjectName?: string;
    copies?: number;
    quality?: number;
  };
}

/**
 * PublishingProductionSystem handles content creation
 *
 * Manages scribe workshops, binder workshops, printing presses, and biography creation.
 *
 * Responsibilities:
 * - Process scribe copying jobs
 * - Process binding jobs
 * - Process printing jobs
 * - Process biography writing jobs
 * - Track production progress
 * - Emit production events
 */
export class PublishingProductionSystem extends BaseSystem {
  public readonly id: SystemId = 'publishing_production';
  public readonly priority = 44;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = THROTTLE.SLOW; // SLOW - 5 seconds (production job updates)

  // Active production jobs
  private activeJobs: Map<string, ProductionJob> = new Map();
  private nextJobId = 1;

  protected onUpdate(ctx: SystemContext): void {
    // Process active jobs
    for (const [jobId, job] of this.activeJobs.entries()) {
      job.progress += ctx.deltaTime;

      // Check if job is complete
      if (job.progress >= job.duration) {
        this.completeJob(jobId, job, ctx.world);
      }
    }
  }

  /**
   * Queue a scribe copying job
   */
  public queueScribeJob(
    scribeId: EntityId,
    workshopId: EntityId,
    sourceBookId: string,
    duration: number
  ): string {
    const jobId = `scribe_${this.nextJobId++}`;
    const job: ProductionJob = {
      jobId,
      type: 'scribe',
      workerId: scribeId,
      workshopId,
      progress: 0,
      duration,
      startTick: 0,
      data: { sourceBookId },
    };

    this.activeJobs.set(jobId, job);

    this.events.emitGeneric('publishing:scribe_started', {
      jobId,
      scribeId,
      workshopId,
      sourceBookId,
    });

    return jobId;
  }

  /**
   * Queue a binding job
   */
  public queueBindingJob(
    binderId: EntityId,
    workshopId: EntityId,
    manuscriptId: string,
    duration: number
  ): string {
    const jobId = `binding_${this.nextJobId++}`;
    const job: ProductionJob = {
      jobId,
      type: 'binding',
      workerId: binderId,
      workshopId,
      progress: 0,
      duration,
      startTick: 0,
      data: { manuscriptId },
    };

    this.activeJobs.set(jobId, job);

    this.events.emitGeneric('publishing:binding_started', {
      jobId,
      binderId,
      workshopId,
      manuscriptId,
    });

    return jobId;
  }

  /**
   * Queue a printing job
   */
  public queuePrintingJob(
    printerId: EntityId,
    pressId: EntityId,
    manuscriptId: string,
    copies: number,
    duration: number
  ): string {
    const jobId = `printing_${this.nextJobId++}`;
    const job: ProductionJob = {
      jobId,
      type: 'printing',
      workerId: printerId,
      workshopId: pressId,
      progress: 0,
      duration,
      startTick: 0,
      data: { manuscriptId, copies },
    };

    this.activeJobs.set(jobId, job);

    this.events.emitGeneric('publishing:printing_started', {
      jobId,
      printerId,
      pressId,
      manuscriptId,
      copies,
    });

    return jobId;
  }

  /**
   * Queue a biography writing job
   */
  public queueBiographyJob(
    writerId: EntityId,
    subjectId: EntityId,
    subjectName: string,
    duration: number
  ): string {
    const jobId = `biography_${this.nextJobId++}`;
    const job: ProductionJob = {
      jobId,
      type: 'biography',
      workerId: writerId,
      workshopId: writerId, // Writer is their own workshop
      progress: 0,
      duration,
      startTick: 0,
      data: { subjectId, subjectName },
    };

    this.activeJobs.set(jobId, job);

    this.events.emitGeneric('publishing:biography_started', {
      jobId,
      writerId,
      subjectId,
      subjectName,
    });

    return jobId;
  }

  /**
   * Complete a production job
   */
  private completeJob(jobId: string, job: ProductionJob, _world: World): void {
    // Calculate quality based on worker skill (placeholder - would integrate with skill system)
    const quality = Math.random() * 0.3 + 0.7; // 0.7-1.0

    switch (job.type) {
      case 'scribe':
        this.events.emitGeneric('publishing:scribe_completed', {
          jobId,
          scribeId: job.workerId,
          workshopId: job.workshopId,
          bookCopied: job.data.sourceBookId!,
          quality,
        });
        break;

      case 'binding':
        this.events.emitGeneric('publishing:binding_completed', {
          jobId,
          binderId: job.workerId,
          workshopId: job.workshopId,
          bookId: `book_${jobId}`,
          quality,
        });
        break;

      case 'printing':
        this.events.emitGeneric('publishing:printing_completed', {
          jobId,
          printerId: job.workerId,
          pressId: job.workshopId,
          booksProduced: job.data.copies || 1,
          quality,
        });
        break;

      case 'biography':
        const pages = Math.floor(Math.random() * 50 + 50); // 50-100 pages
        this.events.emitGeneric('publishing:biography_completed', {
          jobId,
          writerId: job.workerId,
          subjectId: job.data.subjectId!,
          bookId: `biography_${jobId}`,
          quality,
          pages,
        });
        break;
    }

    // Remove from active jobs
    this.activeJobs.delete(jobId);
  }

  /**
   * Cancel a production job
   */
  public cancelJob(jobId: string): boolean {
    return this.activeJobs.delete(jobId);
  }

  /**
   * Get active jobs for a worker
   */
  public getWorkerJobs(workerId: EntityId): ProductionJob[] {
    const jobs: ProductionJob[] = [];
    for (const job of this.activeJobs.values()) {
      if (job.workerId === workerId) {
        jobs.push(job);
      }
    }
    return jobs;
  }

  /**
   * Get all active jobs
   */
  public getAllJobs(): ProductionJob[] {
    return Array.from(this.activeJobs.values());
  }
}
