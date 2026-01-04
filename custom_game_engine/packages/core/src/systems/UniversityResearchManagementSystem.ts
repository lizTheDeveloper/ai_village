/**
 * UniversityResearchManagementSystem - Manages research project initiation for NPC cities
 *
 * This system enables autonomous research by:
 * 1. Finding universities that need new research projects
 * 2. Selecting suitable researchers from city agents
 * 3. Proposing research projects with interesting topics
 * 4. Managing research capacity (max concurrent projects per university)
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { UniversityComponent } from '../components/UniversityComponent.js';
import type { CityDirectorComponent } from '../components/CityDirectorComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { isAgentInCity } from '../components/CityDirectorComponent.js';
import type { UniversitySystem } from './UniversitySystem.js';

/**
 * Research topics for autonomous research proposal
 */
const RESEARCH_TOPICS = [
  'Advanced Agriculture Techniques',
  'Sustainable Resource Management',
  'Community Health and Medicine',
  'Architectural Innovation',
  'Tool and Weapon Crafting',
  'Food Preservation Methods',
  'Animal Husbandry Practices',
  'Water Management Systems',
  'Social Organization Theory',
  'Environmental Conservation',
  'Metallurgy and Smithing',
  'Textile Production Methods',
  'Mathematics and Accounting',
  'Navigation and Cartography',
  'Medicine and Healing Arts',
  'Astronomy and Timekeeping',
  'Engineering and Construction',
  'Brewing and Fermentation',
  'Writing and Record Keeping',
  'Music and Cultural Expression',
] as const;

/**
 * Configuration for research management
 */
export interface UniversityResearchManagementConfig {
  /** Maximum concurrent research projects per university */
  maxConcurrentProjects: number;
  /** Minimum time between research proposals (ticks) */
  minProposalInterval: number;
  /** Number of researchers to assign per project */
  researchersPerProject: number;
}

export const DEFAULT_RESEARCH_MANAGEMENT_CONFIG: UniversityResearchManagementConfig = {
  maxConcurrentProjects: 3,
  minProposalInterval: 600, // 30 seconds at 20 TPS
  researchersPerProject: 3,
};

export class UniversityResearchManagementSystem implements System {
  public readonly id: SystemId = 'university_research_management';
  public readonly priority = 47; // After UniversitySystem (46)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.University];

  private config: UniversityResearchManagementConfig;
  private lastProposalCheck: Map<string, number> = new Map(); // universityId -> tick
  private universitySystem: UniversitySystem | null = null;

  constructor(config: Partial<UniversityResearchManagementConfig> = {}) {
    this.config = { ...DEFAULT_RESEARCH_MANAGEMENT_CONFIG, ...config };
  }

  /**
   * Set the UniversitySystem reference for proposing research.
   * Call this after constructing both systems.
   */
  setUniversitySystem(system: UniversitySystem): void {
    this.universitySystem = system;
  }

  public update(world: World, entities: Entity[], _deltaTime: number): void {
    const currentTick = world.tick;

    // Process each university
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const university = impl.getComponent<UniversityComponent>(CT.University);

      if (!university) {
        continue;
      }

      // Check if it's time to consider new research
      const lastCheck = this.lastProposalCheck.get(impl.id) || 0;
      if (currentTick - lastCheck < this.config.minProposalInterval) {
        continue;
      }

      this.lastProposalCheck.set(impl.id, currentTick);

      // Count active research projects
      const activeCount = university.activeProjects.filter(p => p.status === 'active' || p.status === 'approved').length;

      // Only propose new research if below capacity
      if (activeCount < this.config.maxConcurrentProjects) {
        this.proposeNewResearch(world, impl, university);
      }
    }
  }

  /**
   * Propose a new research project for this university
   */
  private proposeNewResearch(world: World, universityEntity: EntityImpl, _university: UniversityComponent): void {
    // Find city this university belongs to
    const cityDirector = this.findCityForUniversity(world, universityEntity);
    if (!cityDirector) {
      return;
    }

    // Find suitable researchers from city agents
    const researchers = this.findResearchers(world, cityDirector.bounds, this.config.researchersPerProject);
    if (researchers.length === 0) {
      return;
    }

    // Select a random research topic
    const topic = RESEARCH_TOPICS[Math.floor(Math.random() * RESEARCH_TOPICS.length)];
    if (!topic) {
      console.error(`[ResearchManagement] Failed to select research topic`);
      return;
    }

    // Use the UniversitySystem to propose the research
    if (!this.universitySystem) {
      console.error(`[ResearchManagement] UniversitySystem not set. Call setUniversitySystem() first.`);
      return;
    }

    const pi = researchers[0];
    if (!pi) {
      console.error(`[ResearchManagement] No principal investigator found`);
      return;
    }

    const projectId = this.universitySystem.proposeResearch(
      universityEntity.id,
      world,
      topic,
      pi, // First researcher as PI
      researchers.slice(1) // Others as collaborators
    );

    if (projectId) {
    }
  }

  /**
   * Find the city this university belongs to
   */
  private findCityForUniversity(world: World, universityEntity: EntityImpl): CityDirectorComponent | null {
    const universityPos = universityEntity.getComponent<PositionComponent>(CT.Position);
    if (!universityPos) {
      return null;
    }

    const cities = world.query().with('city_director' as ComponentType).executeEntities();

    for (const cityEntity of cities) {
      const impl = cityEntity as EntityImpl;
      const director = impl.getComponent<CityDirectorComponent>('city_director' as ComponentType);

      if (director && isAgentInCity(universityPos.x, universityPos.y, director.bounds)) {
        return director;
      }
    }

    return null;
  }

  /**
   * Find suitable researchers from city agents
   */
  private findResearchers(world: World, cityBounds: { minX: number; maxX: number; minY: number; maxY: number }, count: number): string[] {
    const agents = world.query().with(CT.Agent, CT.Position).executeEntities();
    const candidates: string[] = [];

    for (const agentEntity of agents) {
      const impl = agentEntity as EntityImpl;
      const pos = impl.getComponent<PositionComponent>(CT.Position);
      const agent = impl.getComponent<AgentComponent>(CT.Agent);

      if (pos && agent && isAgentInCity(pos.x, pos.y, cityBounds)) {
        // Prefer agents with higher intelligence or skills
        // For now, just collect all eligible agents
        candidates.push(impl.id);

        if (candidates.length >= count + 5) {
          // Collect extra candidates to have selection pool
          break;
        }
      }
    }

    // Randomly select from candidates
    const selected: string[] = [];
    const pool = [...candidates];

    while (selected.length < count && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      const candidate = pool[index];
      if (candidate) {
        selected.push(candidate);
      }
      pool.splice(index, 1);
    }

    return selected;
  }
}
