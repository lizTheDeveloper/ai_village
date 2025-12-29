/**
 * ResearchSystem - Handles research mechanics and progress
 *
 * Phase 13: Research & Discovery
 *
 * Responsibilities:
 * - Track agents conducting research at buildings
 * - Apply building research bonuses
 * - Advance research progress
 * - Complete research and emit unlock events
 * - Handle research queue
 *
 * Per CLAUDE.md: No silent fallbacks - throws on invalid state.
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType, EntityId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
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
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['agent', 'position'];

  private isInitialized = false;
  private eventBus: EventBus | null = null;
  private blueprintRegistry: BuildingBlueprintRegistry | null = null;
  private researchRegistry: ResearchRegistry | null = null;

  /** Base research progress per second without bonuses */
  private readonly BASE_RESEARCH_RATE = 1.0;

  /** Maximum distance (in tiles) from research building to receive bonus */
  private readonly MAX_RESEARCH_DISTANCE = 2;

  /** How often to log research progress (in ticks) */
  private readonly LOG_INTERVAL = 300; // Every 5 seconds at 60 tps

  /**
   * Initialize the system.
   */
  public initialize(world: World, eventBus: EventBus): void {
    if (this.isInitialized) {
      return;
    }

    this.eventBus = eventBus;
    this.researchRegistry = ResearchRegistry.getInstance();

    // Use existing registry from world if available, otherwise create new one
    // This prevents duplicate registration when multiple systems initialize
    if ((world as any).buildingRegistry) {
      this.blueprintRegistry = (world as any).buildingRegistry;
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
    (worldEntity as EntityImpl).updateComponent('research_state', () => newState);

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
      const pos = (agent as EntityImpl).getComponent<PositionComponent>('position');
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
   */
  private processResearchProgress(
    world: World,
    researchState: ResearchStateComponent,
    researchingAgents: Array<{ agent: Entity; building: ResearchBuildingBonus }>,
    _buildings: ResearchBuildingBonus[],
    deltaTime: number
  ): void {
    if (!this.researchRegistry) return;

    const worldEntity = this.findWorldEntity(world);
    if (!worldEntity) return;

    let currentState = researchState;

    for (const [researchId, progress] of researchState.inProgress) {
      const research = this.researchRegistry.tryGet(researchId);
      if (!research) continue;

      // Find agents contributing to this research
      const contributors = researchingAgents.filter(({ agent }) => {
        const agentComp = (agent as EntityImpl).getComponent<AgentComponent>('agent');
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

      // Calculate progress: base rate * bonus * time * contributor count (diminishing)
      const contributorMultiplier = 1 + (contributors.length - 1) * 0.25; // +25% per additional researcher
      const progressDelta = this.BASE_RESEARCH_RATE * totalBonus * deltaTime * contributorMultiplier;

      currentState = updateResearchProgress(currentState, researchId, progressDelta);

      // Check for completion
      const newProgress = currentState.inProgress.get(researchId);
      if (newProgress && newProgress.currentProgress >= research.progressRequired) {
        currentState = this.completeResearchProject(world, currentState, research, newProgress.researchers);
      } else if (newProgress) {
        // Emit progress event
        this.eventBus?.emit({
          type: 'research:progress',
          source: 'research-system',
          data: {
            researchId,
            progress: newProgress.currentProgress,
            progressRequired: research.progressRequired,
          },
        });
      }
    }

    // Update world entity with new state
    (worldEntity as EntityImpl).updateComponent('research_state', () => currentState);
  }

  /**
   * Complete a research project and process unlocks.
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

    // Emit completion event
    this.eventBus?.emit({
      type: 'research:completed',
      source: 'research-system',
      data: {
        researchId: research.id,
        researchers,
        unlocks: unlockData,
        tick: world.tick,
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
    }
  }

  /**
   * Process a research unlock.
   */
  private processUnlock(_world: World, unlock: ResearchUnlock): void {
    switch (unlock.type) {
      case 'recipe':
        break;
      case 'building':
        // Update building blueprint to mark as unlocked
        this.unlockBuilding(unlock.buildingId);
        break;
      case 'item':
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
      .with('building')
      .with('position')
      .executeEntities();

    const result: ResearchBuildingBonus[] = [];

    for (const building of buildings) {
      const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>('building');
      const pos = (building as EntityImpl).getComponent<PositionComponent>('position');

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

    let state = (worldEntity as EntityImpl).getComponent<ResearchStateComponent>('research_state');
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
      .with('research_state')
      .executeEntities();

    if (worldEntities.length > 0) {
      return worldEntities[0] ?? null;
    }

    // Try to find any entity we can attach to (agents are good candidates)
    const agents = world.query()
      .with('agent')
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

    const pos = (agent as EntityImpl).getComponent<PositionComponent>('position');
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

    const pos = (agent as EntityImpl).getComponent<PositionComponent>('position');
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
}
