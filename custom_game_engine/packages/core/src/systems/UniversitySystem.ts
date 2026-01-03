/**
 * UniversitySystem - Manages university research and collaboration
 *
 * Following the factory/building pattern (LibrarySystem, BookstoreSystem):
 * - Operates on entities with UniversityComponent
 * - Manages research progress with multipliers from TechnologyUnlockComponent
 * - Handles teaching, lectures, and skill transfer
 * - Processes research publishing and collaboration
 *
 * Research Multipliers:
 * - Base: 1.0x (with university)
 * - University collaboration: 1.5x (when unlocked)
 * - Internet research sharing: 3x (when unlocked)
 * - Combined: 4.5x (both unlocked)
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus as CoreEventBus } from '../events/EventBus.js';
import type { UniversityComponent, ResearchProject } from '../components/UniversityComponent.js';
import { startResearch, completeResearch, proposeResearch } from '../components/UniversityComponent.js';
import type { TechnologyUnlockComponent } from '../components/TechnologyUnlockComponent.js';
import { getResearchMultiplier } from '../components/TechnologyUnlockComponent.js';

/**
 * UniversitySystem manages university operations
 */
export class UniversitySystem implements System {
  public readonly id: SystemId = 'university';
  public readonly priority = 46; // After library (45)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.University];

  private eventBus: CoreEventBus;
  private readonly RESEARCH_PROGRESS_PER_TICK = 0.1; // Base research speed
  private lastUpdateTick: number = 0;

  constructor(eventBus: CoreEventBus) {
    this.eventBus = eventBus;
  }

  public update(world: World, entities: Entity[], _deltaTime: number): void {
    const currentTick = world.tick;

    // Get global technology unlock component for research multipliers
    const unlockEntities = world.query().with(CT.TechnologyUnlock).executeEntities();
    const unlock = unlockEntities.length > 0
      ? (unlockEntities[0] as EntityImpl).getComponent<TechnologyUnlockComponent>(CT.TechnologyUnlock)
      : null;

    // Process each university
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const university = impl.getComponent<UniversityComponent>(CT.University);

      if (!university) {
        continue;
      }

      // Apply research multiplier from technology unlocks
      if (unlock) {
        const multiplier = getResearchMultiplier(unlock, '', true); // Has university
        university.researchMultiplier = multiplier;
      }

      // Process active research projects
      this.processResearch(world, impl, university, currentTick);

      // Emit university statistics periodically (every 10 seconds)
      if (currentTick - this.lastUpdateTick >= 200) {
        this.emitUniversityStats(impl.id, university, currentTick);
      }
    }

    if (currentTick - this.lastUpdateTick >= 200) {
      this.lastUpdateTick = currentTick;
    }
  }

  /**
   * Process research projects in progress
   */
  private processResearch(
    world: World,
    entity: EntityImpl,
    university: UniversityComponent,
    currentTick: number
  ): void {
    for (const project of university.activeProjects) {
      // Only process projects that are actively being researched
      if (project.status !== 'active') {
        continue;
      }

      // Apply research multiplier to progress speed
      const progressGain = this.RESEARCH_PROGRESS_PER_TICK * university.researchMultiplier;
      project.progress = Math.min(100, project.progress + progressGain);

      // Complete project when progress reaches 100%
      if (project.progress >= 100) {
        this.completeProject(world, entity, university, project, currentTick);
      }
    }
  }

  /**
   * Complete a research project
   */
  private completeProject(
    _world: World,
    entity: EntityImpl,
    university: UniversityComponent,
    project: ResearchProject,
    currentTick: number
  ): void {
    // Generate paper ID
    const paperId = `paper_${entity.id}_${project.id}_${currentTick}`;

    // Mark project as completed
    completeResearch(university, project.id, paperId, currentTick);

    // Emit research completed event
    this.eventBus.emit({
      type: 'university:research_completed',
      source: this.id,
      data: {
        universityId: entity.id,
        projectId: project.id,
        paperId,
        title: project.title,
        researchers: project.researchers,
        quality: project.quality,
        novelty: project.novelty,
        tick: currentTick,
      },
    });

    console.log(
      `[UniversitySystem] Research completed: "${project.title}" at university ${entity.id}`
    );
  }

  /**
   * Emit university statistics
   */
  private emitUniversityStats(
    universityId: string,
    university: UniversityComponent,
    currentTick: number
  ): void {
    const activeProjects = university.activeProjects.filter(p => p.status === 'active').length;
    const completedProjects = university.activeProjects.filter(p => p.status === 'published').length;

    this.eventBus.emit({
      type: 'university:stats',
      source: this.id,
      data: {
        universityId,
        employeeCount: university.employees.length,
        activeProjects,
        completedProjects,
        totalPublications: university.publications.length,
        researchMultiplier: university.researchMultiplier,
        tick: currentTick,
      },
    });
  }

  /**
   * Start a new research project (public API for other systems)
   */
  public proposeResearch(
    universityId: string,
    world: World,
    title: string,
    principalInvestigator: string,
    researchers: string[]
  ): string | null {
    const entity = world.getEntity(universityId);
    if (!entity) return null;

    const university = (entity as EntityImpl).getComponent<UniversityComponent>(CT.University);
    if (!university) return null;

    // Create project ID
    const projectId = `project_${universityId}_${world.tick}_${Math.random().toString(36).substr(2, 9)}`;

    // Create research project object
    const project: ResearchProject = {
      id: projectId,
      title,
      field: 'general',
      department: 'natural_sciences',
      principalInvestigator,
      researchers,
      students: [],
      status: 'approved', // Skip funding for simplicity
      startedTick: world.tick,
      expectedDuration: 2000, // 100 seconds at 20 TPS
      progress: 0,
      fundingRequired: 0,
      fundingReceived: 0,
      paperId: undefined,
      discoveries: [],
      quality: 0.5 + Math.random() * 0.5, // 0.5-1.0
      novelty: Math.random(),
    };

    // Add project to university
    proposeResearch(university, project);

    // Start research immediately
    startResearch(university, projectId, world.tick);

    this.eventBus.emit({
      type: 'university:research_started',
      source: this.id,
      data: {
        universityId,
        projectId,
        title,
        principalInvestigator,
        researchers,
        tick: world.tick,
      },
    });

    return projectId;
  }
}
