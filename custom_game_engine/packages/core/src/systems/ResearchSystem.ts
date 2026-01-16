/**
 * ResearchSystem - Handles research mechanics and progress
 *
 * Phase 13: Research & Discovery
 *
 * Responsibilities:
 * - Track agents conducting research at buildings
 * - Apply building research bonuses
 * - Advance research progress through PAPER PUBLICATION
 * - Complete research when enough papers are published
 * - Handle research queue
 *
 * RESEARCH PROGRESS MODEL:
 * Research is advanced by publishing academic papers, not arbitrary points.
 * Each tier requires (tier + 1) papers to complete:
 * - Tier 1: 2 papers
 * - Tier 2: 3 papers
 * - ...
 * - Tier 8: 9 papers
 *
 * Papers cite prerequisite research, creating a citation network.
 * Authors gain fame based on h-index and citation counts.
 *
 * Per CLAUDE.md: No silent fallbacks - throws on invalid state.
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType, EntityId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import {
  type ResearchStateComponent,
  updateResearchProgress,
  completeResearch,
  startResearch,
  createResearchStateComponent,
} from '../components/ResearchStateComponent.js';
import { ResearchRegistry } from '../research/ResearchRegistry.js';
import type { ResearchField, ResearchDefinition, ResearchUnlock } from '../research/types.js';
import { BuildingBlueprintRegistry } from '../buildings/BuildingBlueprintRegistry.js';
import { getAcademicPaperSystem, type AcademicPaperSystem } from '../research/AcademicPaperSystem.js';

/**
 * Research building bonus configuration.
 * Extracted from BuildingBlueprint functionality array.
 */
interface ResearchBuildingBonus {
  buildingId: EntityId;
  buildingType: string;
  fields: string[];
  bonus: number;
  position: { x: number; y: number };
}

/**
 * ResearchSystem handles research mechanics.
 */
export class ResearchSystem implements System {
  public readonly id: SystemId = 'research';
  public readonly priority: number = 55; // After BuildingSystem (16), before most others
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Agent, CT.Position];

  private isInitialized = false;
  private eventBus: EventBus | null = null;
  private blueprintRegistry: BuildingBlueprintRegistry | null = null;
  private researchRegistry: ResearchRegistry | null = null;
  private paperSystem: AcademicPaperSystem | null = null;

  /** Base research progress per second - used to accumulate toward paper publication */
  private readonly BASE_RESEARCH_RATE = 1.0;

  /** Progress required to publish a paper (research time before next paper) */
  private readonly PROGRESS_PER_PAPER = 100;

  /** Maximum distance (in tiles) from research building to receive bonus */
  private readonly MAX_RESEARCH_DISTANCE = 2;

  /** How often to log research progress (in ticks) */
  private readonly LOG_INTERVAL = 300; // Every 5 seconds at 60 tps

  /** Track accumulated progress toward next paper for each research */
  private progressTowardPaper: Map<string, number> = new Map();

  /**
   * Initialize the system.
   */
  public initialize(world: World, eventBus: EventBus): void {
    if (this.isInitialized) {
      return;
    }

    this.eventBus = eventBus;
    this.researchRegistry = ResearchRegistry.getInstance();
    this.paperSystem = getAcademicPaperSystem();

    // Use existing registry from world if available, otherwise create new one
    // This prevents duplicate registration when multiple systems initialize
    if ('buildingRegistry' in world && world.buildingRegistry instanceof BuildingBlueprintRegistry) {
      this.blueprintRegistry = world.buildingRegistry;
    } else {
      this.blueprintRegistry = new BuildingBlueprintRegistry();
      this.blueprintRegistry.registerDefaults();
      this.blueprintRegistry.registerTier2Stations();
      this.blueprintRegistry.registerTier3Stations();
      this.blueprintRegistry.registerExampleBuildings();
      this.blueprintRegistry.registerResearchBuildings();
    }

    // Subscribe to research-related events
    // Use 'research:started' which is already in EventMap - we'll emit it to start research
    eventBus.subscribe('research:started', (event) => {
      const data = event.data as { agentId: string; researchId: string };
      // Only handle if this is a start request (not already processing)
      if (!this.getOrCreateResearchState(world)?.inProgress.has(data.researchId)) {
        this.handleStartResearchRequest(world, data.agentId, data.researchId);
      }
    });

    this.isInitialized = true;
  }

  /**
   * Handle request to start research.
   */
  private handleStartResearchRequest(
    world: World,
    agentId: string,
    researchId: string
  ): void {
    const researchState = this.getOrCreateResearchState(world);
    if (!researchState) {
      console.error('[ResearchSystem] Could not get research state');
      return;
    }

    // Validate research exists and prerequisites met
    if (!this.researchRegistry) {
      throw new Error('[ResearchSystem] ResearchRegistry not initialized');
    }

    const research = this.researchRegistry.tryGet(researchId);
    if (!research) {
      console.error(`[ResearchSystem] Research '${researchId}' not found`);
      return;
    }

    // Check prerequisites
    if (!this.researchRegistry.canStart(researchId, researchState.completed)) {
      console.warn(`[ResearchSystem] Prerequisites not met for '${researchId}'`);
      return;
    }

    // Start research
    const worldEntity = this.findWorldEntity(world);
    if (!worldEntity) {
      throw new Error('[ResearchSystem] World entity not found');
    }

    const newState = startResearch(researchState, researchId, agentId, world.tick);
    (worldEntity as EntityImpl).updateComponent(CT.ResearchState, () => newState);

    this.eventBus?.emit({
      type: 'research:started',
      source: agentId,
      data: {
        researchId,
        agentId,
        researchers: newState.inProgress.get(researchId)?.researchers ?? [agentId],
      },
    });

  }

  /**
   * Main update loop.
   */
  public update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    const researchState = this.getOrCreateResearchState(world);
    if (!researchState || researchState.inProgress.size === 0) {
      return;
    }

    // Get all research buildings
    const researchBuildings = this.getResearchBuildings(world);

    // Find agents that are researching (at research buildings)
    const researchingAgents = this.findResearchingAgents(entities, researchBuildings);

    // Process research progress
    if (researchingAgents.length > 0) {
      this.processResearchProgress(world, researchState, researchingAgents, researchBuildings, deltaTime);
    }

    // Log status periodically
    if (world.tick % this.LOG_INTERVAL === 0 && researchState.inProgress.size > 0) {
      this.logResearchStatus(researchState);
    }
  }

  /**
   * Find agents that are at or near research buildings.
   */
  private findResearchingAgents(
    agents: ReadonlyArray<Entity>,
    buildings: ResearchBuildingBonus[]
  ): Array<{ agent: Entity; building: ResearchBuildingBonus }> {
    const result: Array<{ agent: Entity; building: ResearchBuildingBonus }> = [];

    for (const agent of agents) {
      const pos = (agent as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (!pos) continue;

      // Find nearest research building
      let nearestBuilding: ResearchBuildingBonus | null = null;
      let nearestDistance = Infinity;

      for (const building of buildings) {
        const dx = pos.x - building.position.x;
        const dy = pos.y - building.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= this.MAX_RESEARCH_DISTANCE && distance < nearestDistance) {
          nearestDistance = distance;
          nearestBuilding = building;
        }
      }

      if (nearestBuilding) {
        result.push({ agent, building: nearestBuilding });
      }
    }

    return result;
  }

  /**
   * Process research progress for all in-progress research.
   *
   * Research progress is now measured by PAPER PUBLICATION:
   * 1. Agents accumulate progress toward publishing a paper
   * 2. When enough progress is accumulated, a paper is published
   * 3. Research completes when enough papers are published (tier + 1)
   */
  private processResearchProgress(
    world: World,
    researchState: ResearchStateComponent,
    researchingAgents: Array<{ agent: Entity; building: ResearchBuildingBonus }>,
    _buildings: ResearchBuildingBonus[],
    deltaTime: number
  ): void {
    if (!this.researchRegistry || !this.paperSystem) return;

    const worldEntity = this.findWorldEntity(world);
    if (!worldEntity) return;

    let currentState = researchState;

    for (const [researchId, progress] of researchState.inProgress) {
      const research = this.researchRegistry.tryGet(researchId);
      if (!research) continue;

      // Find agents contributing to this research
      const contributors = researchingAgents.filter(({ agent }) => {
        const agentComp = (agent as EntityImpl).getComponent<AgentComponent>(CT.Agent);
        return agentComp && progress.researchers.includes(agent.id);
      });

      if (contributors.length === 0) continue;

      // Calculate progress with building bonuses
      let totalBonus = 1.0;
      for (const { building } of contributors) {
        // Check if building's research fields match this research
        if (building.fields.length === 0 || building.fields.includes(research.field)) {
          totalBonus = Math.max(totalBonus, building.bonus);
        }
      }

      // Calculate progress toward next paper: base rate * bonus * time * contributor count
      const contributorMultiplier = 1 + (contributors.length - 1) * 0.25; // +25% per additional researcher
      const progressDelta = this.BASE_RESEARCH_RATE * totalBonus * deltaTime * contributorMultiplier;

      // Accumulate progress toward next paper
      const currentPaperProgress = this.progressTowardPaper.get(researchId) || 0;
      const newPaperProgress = currentPaperProgress + progressDelta;
      this.progressTowardPaper.set(researchId, newPaperProgress);

      // Check if we should publish a paper
      if (newPaperProgress >= this.PROGRESS_PER_PAPER) {
        // Reset progress toward next paper
        this.progressTowardPaper.set(researchId, newPaperProgress - this.PROGRESS_PER_PAPER);

        // Get first author (contributor with most time on project)
        const firstContributor = contributors[0]!;
        const firstIdentity = (firstContributor.agent as EntityImpl).getComponent<IdentityComponent>(CT.Identity);
        const firstAuthorId = firstContributor.agent.id;
        const firstAuthorName = firstIdentity?.name ?? 'Unknown Researcher';

        // Get co-authors (other contributors)
        const coAuthorIds: string[] = [];
        const coAuthorNames: string[] = [];
        for (let i = 1; i < contributors.length; i++) {
          const contributor = contributors[i]!;
          const identity = (contributor.agent as EntityImpl).getComponent<IdentityComponent>(CT.Identity);
          coAuthorIds.push(contributor.agent.id);
          coAuthorNames.push(identity?.name ?? 'Unknown Researcher');
        }

        // Check if this paper will be a breakthrough (random chance, higher for high-tier)
        const breakthroughChance = Math.min(0.3, research.tier * 0.05);
        const isBreakthrough = Math.random() < breakthroughChance;

        // Publish the paper!
        const { paper, researchComplete } = this.paperSystem.publishPaper(
          researchId,
          firstAuthorId,
          firstAuthorName,
          coAuthorIds,
          coAuthorNames,
          isBreakthrough
        );

        // Update research state progress (using papers as the progress metric)
        const paperBib = this.paperSystem.getManager().getBibliography(researchId);
        const papersPublished = paperBib?.papers.length || 1;
        const papersRequired = research.tier + 1;

        // Update the progress value to reflect papers published (scale to progressRequired)
        const progressPercentage = papersPublished / papersRequired;
        const scaledProgress = progressPercentage * research.progressRequired;
        currentState = updateResearchProgress(
          currentState,
          researchId,
          scaledProgress - (currentState.inProgress.get(researchId)?.currentProgress || 0)
        );

        // Emit paper published event
        this.eventBus?.emit({
          type: 'research:progress',
          source: 'research-system',
          data: {
            researchId,
            progress: papersPublished,
            progressRequired: papersRequired,
            paperPublished: {
              id: paper.id,
              title: paper.title,
              authors: [firstAuthorName, ...coAuthorNames],
              isBreakthrough,
            },
          },
        });

        // Check for research completion
        if (researchComplete) {
          currentState = this.completeResearchProject(world, currentState, research, progress.researchers);
          // Clean up paper progress tracking
          this.progressTowardPaper.delete(researchId);
        }
      } else {
        // Emit regular progress event (progress toward next paper)
        const paperBib = this.paperSystem.getManager().getBibliography(researchId);
        const papersPublished = paperBib?.papers.length || 0;
        const papersRequired = research.tier + 1;
        const progressTowardNext = (newPaperProgress / this.PROGRESS_PER_PAPER) * 100;

        // Calculate overall progress percentage for compatibility
        const overallProgress = papersPublished + (progressTowardNext / 100);
        const progressPercentage = (overallProgress / papersRequired) * research.progressRequired;

        this.eventBus?.emit({
          type: 'research:progress',
          source: 'research-system',
          data: {
            researchId,
            progress: progressPercentage,
            progressRequired: research.progressRequired,
            papersPublished,
            papersRequired,
            progressTowardNextPaper: progressTowardNext,
          },
        });
      }
    }

    // Update world entity with new state
    (worldEntity as EntityImpl).updateComponent(CT.ResearchState, () => currentState);
  }

  /**
   * Complete a research project and process unlocks.
   * Includes full paper bibliography from the academic paper system.
   */
  private completeResearchProject(
    world: World,
    state: ResearchStateComponent,
    research: ResearchDefinition,
    researchers: string[]
  ): ResearchStateComponent {

    const newState = completeResearch(state, research.id, world.tick);

    // Process unlocks
    const unlockData: Array<{ type: string; id: string }> = [];
    for (const unlock of research.unlocks) {
      this.processUnlock(world, unlock);
      unlockData.push({ type: unlock.type, id: this.getUnlockId(unlock) });
    }

    // Get bibliography for this research
    const bibliography = this.paperSystem?.getManager().getBibliography(research.id);
    const papers = bibliography?.papers
      .map(paperId => this.paperSystem?.getManager().getPaper(paperId))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map(p => ({
        id: p.id,
        title: p.title,
        authors: [p.firstAuthorName, ...p.coAuthorNames],
        citations: p.citations.length,
        citedBy: p.citedByCount,
        isBreakthrough: p.isBreakthrough,
      })) || [];

    // Emit completion event with bibliography
    this.eventBus?.emit({
      type: 'research:completed',
      source: 'research-system',
      data: {
        researchId: research.id,
        researchName: research.name,
        researchers,
        unlocks: unlockData,
        tick: world.tick,
        bibliography: {
          paperCount: papers.length,
          papers,
          leadResearcherId: bibliography?.leadResearcherId,
          contributorIds: bibliography?.contributorIds || [],
        },
      },
    });

    // Emit individual unlock events
    for (const unlock of research.unlocks) {
      this.eventBus?.emit({
        type: 'research:unlocked',
        source: 'research-system',
        data: {
          researchId: research.id,
          type: unlock.type,
          contentId: this.getUnlockId(unlock),
        },
      });
    }

    return newState;
  }

  /**
   * Get the content ID from an unlock.
   */
  private getUnlockId(unlock: ResearchUnlock): string {
    switch (unlock.type) {
      case 'recipe':
        return unlock.recipeId;
      case 'building':
        return unlock.buildingId;
      case 'item':
        return unlock.itemId;
      case 'crop':
        return unlock.cropId;
      case 'research':
        return unlock.researchId;
      case 'ability':
        return unlock.abilityId;
      case 'knowledge':
        return unlock.knowledgeId;
      case 'generated':
        return unlock.generationType;
      default: {
        // TypeScript exhaustiveness check - this should never be reached
        const exhaustiveCheck: never = unlock;
        throw new Error(`Unknown unlock type: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Process a research unlock.
   */
  private processUnlock(_world: World, unlock: ResearchUnlock): void {
    switch (unlock.type) {
      case 'recipe':
        break;
      case CT.Building:
        // Update building blueprint to mark as unlocked
        this.unlockBuilding(unlock.buildingId);
        break;
      case CT.Item:
        break;
      case 'research':
        break;
      default:
    }
  }

  /**
   * Mark a building as unlocked in the blueprint registry.
   */
  private unlockBuilding(_buildingId: string): void {
    // Building unlock would need blueprint registry modification
    // For now, just log it - UI will check research state
  }

  /**
   * Get all research buildings with their bonuses.
   */
  private getResearchBuildings(world: World): ResearchBuildingBonus[] {
    const buildings = world.query()
      .with(CT.Building)
      .with(CT.Position)
      .executeEntities();

    const result: ResearchBuildingBonus[] = [];

    for (const building of buildings) {
      const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>(CT.Building);
      const pos = (building as EntityImpl).getComponent<PositionComponent>(CT.Position);

      if (!buildingComp || !buildingComp.isComplete || !pos) continue;

      // Get blueprint for this building
      const blueprint = this.blueprintRegistry?.tryGet(buildingComp.buildingType);
      if (!blueprint) continue;

      // Find research functionality
      const researchFunc = blueprint.functionality.find(f => f.type === 'research') as
        | { type: 'research'; fields: string[]; bonus: number }
        | undefined;

      if (researchFunc) {
        result.push({
          buildingId: building.id,
          buildingType: buildingComp.buildingType,
          fields: researchFunc.fields,
          bonus: researchFunc.bonus,
          position: { x: pos.x, y: pos.y },
        });
      }
    }

    return result;
  }

  /**
   * Get or create the research state component.
   */
  private getOrCreateResearchState(world: World): ResearchStateComponent | null {
    const worldEntity = this.findWorldEntity(world);
    if (!worldEntity) {
      return null;
    }

    let state = (worldEntity as EntityImpl).getComponent<ResearchStateComponent>(CT.ResearchState);
    if (!state) {
      // Create and attach research state
      state = createResearchStateComponent();
      (worldEntity as EntityImpl).addComponent(state);
    }

    return state;
  }

  /**
   * Find the world entity (first entity with world_state component, or create one).
   */
  private findWorldEntity(world: World): Entity | null {
    // Try to find existing world entity
    const worldEntities = world.query()
      .with(CT.ResearchState)
      .executeEntities();

    if (worldEntities.length > 0) {
      return worldEntities[0] ?? null;
    }

    // Try to find any entity we can attach to (agents are good candidates)
    const agents = world.query()
      .with(CT.Agent)
      .executeEntities();

    if (agents.length > 0) {
      return agents[0] ?? null;
    }

    return null;
  }

  /**
   * Log current research status.
   */
  private logResearchStatus(_state: ResearchStateComponent): void {
    // Research status logging disabled (console.log removed)
  }

  /**
   * Get available research (prerequisites met, not completed).
   */
  public getAvailableResearch(world: World): ResearchDefinition[] {
    const state = this.getOrCreateResearchState(world);
    if (!state || !this.researchRegistry) {
      return [];
    }

    return this.researchRegistry.getNextAvailable(state.completed);
  }

  /**
   * Check if an agent is at a research building.
   */
  public isAgentAtResearchBuilding(world: World, agentId: string): boolean {
    const agent = world.getEntity(agentId);
    if (!agent) return false;

    const pos = (agent as EntityImpl).getComponent<PositionComponent>(CT.Position);
    if (!pos) return false;

    const buildings = this.getResearchBuildings(world);
    for (const building of buildings) {
      const dx = pos.x - building.position.x;
      const dy = pos.y - building.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= this.MAX_RESEARCH_DISTANCE) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get research speed bonus for an agent at their current location.
   */
  public getResearchBonus(world: World, agentId: string, researchField: ResearchField): number {
    const agent = world.getEntity(agentId);
    if (!agent) return 1.0;

    const pos = (agent as EntityImpl).getComponent<PositionComponent>(CT.Position);
    if (!pos) return 1.0;

    const buildings = this.getResearchBuildings(world);
    let bestBonus = 1.0;

    for (const building of buildings) {
      const dx = pos.x - building.position.x;
      const dy = pos.y - building.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.MAX_RESEARCH_DISTANCE) {
        if (building.fields.length === 0 || building.fields.includes(researchField)) {
          bestBonus = Math.max(bestBonus, building.bonus);
        }
      }
    }

    return bestBonus;
  }

  /**
   * Get paper-based research progress for a specific research.
   * Returns papers published, papers required, and progress toward next paper.
   */
  public getPaperProgress(researchId: string): {
    papersPublished: number;
    papersRequired: number;
    progressTowardNextPaper: number;
    bibliography: Array<{
      title: string;
      authors: string[];
      citedByCount: number;
      isBreakthrough: boolean;
    }>;
  } | null {
    if (!this.paperSystem || !this.researchRegistry) return null;

    const research = this.researchRegistry.tryGet(researchId);
    if (!research) return null;

    const bib = this.paperSystem.getManager().getBibliography(researchId);
    const papersPublished = bib?.papers.length || 0;
    const papersRequired = research.tier + 1;
    const progressTowardNext = this.progressTowardPaper.get(researchId) || 0;

    const bibliography = (bib?.papers || [])
      .map(paperId => this.paperSystem?.getManager().getPaper(paperId))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map(p => ({
        title: p.title,
        authors: [p.firstAuthorName, ...p.coAuthorNames],
        citedByCount: p.citedByCount,
        isBreakthrough: p.isBreakthrough,
      }));

    return {
      papersPublished,
      papersRequired,
      progressTowardNextPaper: (progressTowardNext / this.PROGRESS_PER_PAPER) * 100,
      bibliography,
    };
  }

  /**
   * Get the academic paper system for direct access to paper/citation data.
   */
  public getPaperSystem(): AcademicPaperSystem | null {
    return this.paperSystem;
  }

  /**
   * Get author metrics for an agent.
   * Returns h-index, citation count, and publication stats.
   */
  public getAuthorMetrics(agentId: string): {
    hIndex: number;
    totalCitations: number;
    paperCount: number;
    firstAuthorCount: number;
    breakthroughCount: number;
  } | null {
    return this.paperSystem?.getAuthorMetrics(agentId) || null;
  }
}
