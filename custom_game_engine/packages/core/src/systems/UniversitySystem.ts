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

import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus as CoreEventBus } from '../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { UniversityComponent, ResearchProject } from '../components/UniversityComponent.js';
import { startResearch, completeResearch, proposeResearch } from '../components/UniversityComponent.js';
import type { TechnologyUnlockComponent } from '../components/TechnologyUnlockComponent.js';
import { getResearchMultiplier } from '../components/TechnologyUnlockComponent.js';
import { getAcademicPaperSystem } from '../research/AcademicPaperSystem.js';
import { ResearchRegistry } from '../research/ResearchRegistry.js';
import type { ResearchField } from '../research/types.js';

/**
 * Map university research topics to research fields
 */
function mapResearchTopicToField(topic: string): ResearchField {
  const topicLower = topic.toLowerCase();

  if (topicLower.includes('agricult') || topicLower.includes('farm') || topicLower.includes('crop')) {
    return 'agriculture';
  }
  if (topicLower.includes('construct') || topicLower.includes('architect') || topicLower.includes('building')) {
    return 'construction';
  }
  if (topicLower.includes('craft') || topicLower.includes('tool') || topicLower.includes('weapon')) {
    return 'crafting';
  }
  if (topicLower.includes('metal') || topicLower.includes('smith') || topicLower.includes('alloy')) {
    return 'metallurgy';
  }
  if (topicLower.includes('alche') || topicLower.includes('potion') || topicLower.includes('transmut')) {
    return 'alchemy';
  }
  if (topicLower.includes('textile') || topicLower.includes('fabric') || topicLower.includes('weav')) {
    return 'textiles';
  }
  if (topicLower.includes('food') || topicLower.includes('cook') || topicLower.includes('cuisine') || topicLower.includes('brew')) {
    return 'cuisine';
  }
  if (topicLower.includes('machine') || topicLower.includes('automat') || topicLower.includes('engine')) {
    return 'machinery';
  }
  if (topicLower.includes('nature') || topicLower.includes('animal') || topicLower.includes('conserv') || topicLower.includes('environment')) {
    return 'nature';
  }
  if (topicLower.includes('social') || topicLower.includes('community') || topicLower.includes('govern') || topicLower.includes('econom') || topicLower.includes('writing') || topicLower.includes('record') || topicLower.includes('mathemat')) {
    return 'society';
  }
  if (topicLower.includes('arcane') || topicLower.includes('magic') || topicLower.includes('spell')) {
    return 'arcane';
  }
  if (topicLower.includes('gene') || topicLower.includes('heredit') || topicLower.includes('dna')) {
    return 'genetics';
  }

  // Default to experimental for novel topics
  return 'experimental';
}

/**
 * Convert research topic to a research ID
 */
function topicToResearchId(topic: string): string {
  return 'university_' + topic.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

/**
 * UniversitySystem manages university operations
 */
export class UniversitySystem extends BaseSystem {
  public readonly id: SystemId = 'university';
  public readonly priority = 46; // After library (45)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.University];
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  private eventBus: CoreEventBus;
  private readonly RESEARCH_PROGRESS_PER_TICK = 0.1; // Base research speed
  private lastStatsTick: number = 0;

  constructor(eventBus: CoreEventBus) {
    super();
    this.eventBus = eventBus;
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const entities = ctx.activeEntities;
    const currentTick = ctx.tick;

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
      if (currentTick - this.lastStatsTick >= 200) {
        this.emitUniversityStats(impl.id, university, currentTick);
      }
    }

    if (currentTick - this.lastStatsTick >= 200) {
      this.lastStatsTick = currentTick;
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

      // Complete project when progress reaches 100% (use 99.99 to handle floating point precision)
      if (project.progress >= 99.99) {
        project.progress = 100; // Ensure exactly 100%
        this.completeProject(world, entity, university, project, currentTick);
      }
    }
  }

  /**
   * Complete a research project
   */
  private completeProject(
    world: World,
    entity: EntityImpl,
    university: UniversityComponent,
    project: ResearchProject,
    currentTick: number
  ): void {
    // Map research topic to field and ID
    const researchField = mapResearchTopicToField(project.title);
    const researchId = topicToResearchId(project.title);

    // Register research in ResearchRegistry if it doesn't exist
    const registry = ResearchRegistry.getInstance();
    if (!registry.tryGet(researchId)) {
      registry.register({
        id: researchId,
        name: project.title,
        description: `University research project: ${project.title}`,
        field: researchField,
        tier: 2, // University research is tier 2
        type: 'predefined',
        progressRequired: 100,
        prerequisites: [],
        unlocks: [],
      });
    }

    // Get researcher names from IDs
    const getAgentName = (agentId: string): string => {
      const agentEntity = world.getEntity(agentId);
      if (agentEntity) {
        const agentComp = (agentEntity as EntityImpl).getComponent<any>(CT.Agent);
        return agentComp?.name || agentId;
      }
      return agentId;
    };

    const piName = getAgentName(project.principalInvestigator);
    const coAuthorNames = project.researchers.map(getAgentName);

    // Publish academic paper via AcademicPaperSystem
    try {
      const paperSystem = getAcademicPaperSystem();
      const { paper, researchComplete } = paperSystem.publishPaper(
        researchId,
        project.principalInvestigator,
        piName,
        project.researchers,
        coAuthorNames,
        project.quality >= 80 // High quality = breakthrough
      );


      // Mark project as completed
      completeResearch(university, project.id, paper.id, currentTick);

      // Emit research completed event
      this.events.emit('university:research_completed', {
        universityId: entity.id,
        projectId: project.id,
        paperId: paper.id,
        title: project.title,
        researchers: project.researchers,
        quality: project.quality,
        novelty: project.novelty,
        tick: currentTick,
        researchComplete, // Did this complete the overall research?
      });

      if (researchComplete) {
      }
    } catch (error) {
      console.error(`[UniversitySystem] Failed to publish paper for "${project.title}":`, error);

      // Fallback: mark complete without paper
      const paperId = `paper_${entity.id}_${project.id}_${currentTick}`;
      completeResearch(university, project.id, paperId, currentTick);
    }
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

    this.events.emit('university:stats', {
      universityId,
      employeeCount: university.employees.length,
      activeProjects,
      completedProjects,
      totalPublications: university.publications.length,
      researchMultiplier: university.researchMultiplier,
      tick: currentTick,
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

    this.events.emit('university:research_started', {
      universityId,
      projectId,
      title,
      principalInvestigator,
      researchers,
      tick: world.tick,
    });

    return projectId;
  }
}
