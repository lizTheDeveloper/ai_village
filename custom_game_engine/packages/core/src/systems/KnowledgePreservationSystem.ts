/**
 * KnowledgePreservationSystem - Preserves and recovers knowledge during dark ages
 *
 * This system implements knowledge preservation mechanics:
 * 1. During collapse: Libraries/monasteries/universities preserve X% of technologies
 * 2. During dark age: 1% chance per century to rediscover lost tech per library
 * 3. Higher chance with more libraries/universities
 * 4. Reinvention: 5% chance if precursor techs still known
 * 5. Repository degradation without maintenance
 *
 * Priority: 230 (after CollapseSystem which triggers at 225)
 * Throttle: 1000 ticks (every 50 seconds, ~1 century in-game)
 *
 * See: custom_game_engine/openspec/specs/grand-strategy/08-TECHNOLOGY-ERAS.md
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { KnowledgeRepositoryComponent } from '../components/KnowledgeRepositoryComponent.js';
import {
  canPreserveKnowledge,
  getEffectiveCapacity,
  getEffectiveDiscoveryBonus,
  preserveTechnology,
  removeTechnology,
  calculateDegradationRate,
} from '../components/KnowledgeRepositoryComponent.js';
import type { TechnologyEraComponent } from '../components/TechnologyEraComponent.js';
import { getEraIndex } from '../components/TechnologyEraComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

// ============================================================================
// CONSTANTS & OPTIMIZATIONS
// ============================================================================

/** Base rediscovery chance per century (1%) */
const BASE_REDISCOVERY_CHANCE = 0.01;

/** Reinvention chance if precursor techs known (5%) */
const REINVENTION_CHANCE = 0.05;

/** Degradation check interval (every 1000 ticks) */
const DEGRADATION_CHECK_INTERVAL = 1000;

/** Preservation roll during collapse (percentage of techs to preserve) */
const PRESERVATION_RATE = Object.freeze({
  library: 0.3,      // 30% preservation rate
  monastery: 0.4,    // 40% (more careful preservation)
  university: 0.25,  // 25% (focused on advanced tech)
  genetic_archive: 0.7,   // 70%
  quantum_archive: 0.95,  // 95%
});

/**
 * Object literal for GC optimization - reused for all events
 */
const preservationEventData = {
  civilizationId: '',
  repositoryId: '',
  technologyId: '',
  repositoryType: '',
  tick: 0,
};

const rediscoveryEventData = {
  civilizationId: '',
  repositoryId: '',
  technologyId: '',
  repositoryType: '',
  rediscoveryMethod: '',
  tick: 0,
};

const degradationEventData = {
  repositoryId: '',
  civilizationId: '',
  conditionLevel: 0,
  technologiesLost: 0,
  tick: 0,
};

/**
 * KnowledgePreservationSystem manages knowledge preservation and recovery
 */
export class KnowledgePreservationSystem extends BaseSystem {
  public readonly id: SystemId = 'knowledge_preservation';
  public readonly priority: number = 230; // After CollapseSystem (225)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.KnowledgeRepository];
  // Only run when knowledge repositories exist (O(1) activation check)
  public readonly activationComponents = [CT.KnowledgeRepository] as const;
  protected readonly throttleInterval = 1000; // Every 50 seconds (~1 century)

  // ========== Event Subscriptions ==========

  /**
   * Initialize system and subscribe to collapse events
   */
  public init(): void {
    // Subscribe to collapse events to trigger preservation
    this.events.on('civilization:collapse_triggered', (data) => {
      this.handleCollapseEvent(data);
    });
  }

  /**
   * Update - check for rediscovery and degradation
   */
  protected onUpdate(ctx: SystemContext): void {
    const { world } = ctx;

    // Get all repositories ONCE before loop
    const repositories = ctx.activeEntities;

    // Group repositories by civilization for batch processing
    const reposByCiv = this.groupRepositoriesByCivilization(repositories);

    // Process each civilization's repositories
    for (const [civId, civRepos] of reposByCiv.entries()) {
      this.processCivilizationRepositories(world, civId, civRepos);
    }
  }

  // ========== Collapse Handling ==========

  /**
   * Handle civilization collapse - preserve technologies
   */
  private handleCollapseEvent(data: {
    civilizationId: string;
    trigger: string;
    severity: string;
    erasLost: number;
    tick: number;
  }): void {
    // Get world from event bus (attached as property)
    const world = (this.events as any).world as World;
    if (!world) {
      console.error('[KnowledgePreservation] Cannot access world from event bus');
      return;
    }

    const { civilizationId, tick } = data;

    // Get civilization's TechnologyEra component
    const civEntities = world.query().with(CT.TechnologyEra).executeEntities();
    let civEntity: EntityImpl | null = null;
    let eraComponent: TechnologyEraComponent | null = null;

    for (const entity of civEntities) {
      const impl = entity as EntityImpl;
      const era = impl.getComponent<TechnologyEraComponent>(CT.TechnologyEra);
      // Match by some identifier (we'll assume first match for now)
      // TODO: Add civilizationId field to TechnologyEraComponent
      if (era) {
        civEntity = impl;
        eraComponent = era;
        break;
      }
    }

    if (!civEntity || !eraComponent) {
      return; // No civilization found
    }

    // Get repositories for this civilization
    const repositories = world.query().with(CT.KnowledgeRepository).executeEntities();
    const civRepos = repositories.filter((entity) => {
      const impl = entity as EntityImpl;
      const repo = impl.getComponent<KnowledgeRepositoryComponent>(CT.KnowledgeRepository);
      return repo && repo.civilizationId === civilizationId;
    });

    if (civRepos.length === 0) {
      return; // No repositories to preserve knowledge
    }

    // For each technology being lost, roll for preservation
    const lostTechs = eraComponent.lostTechnologies;
    const preservedByRepo = new Map<string, string[]>(); // repoId -> techIds

    for (const techId of lostTechs) {
      // Try to preserve in each repository
      for (const repoEntity of civRepos) {
        const repoImpl = repoEntity as EntityImpl;
        const repo = repoImpl.getComponent<KnowledgeRepositoryComponent>(CT.KnowledgeRepository);

        if (!repo || !canPreserveKnowledge(repo)) {
          continue;
        }

        // Roll for preservation
        const preservationRate = PRESERVATION_RATE[repo.repositoryType] || 0.3;
        if (Math.random() < preservationRate) {
          // Try to preserve
          if (preserveTechnology(repo, techId)) {
            // Track for event emission
            if (!preservedByRepo.has(repoImpl.id)) {
              preservedByRepo.set(repoImpl.id, []);
            }
            preservedByRepo.get(repoImpl.id)!.push(techId);
          }
        }
      }
    }

    // Emit preservation events
    for (const [repoId, techIds] of preservedByRepo.entries()) {
      const repoImpl = civRepos.find((e) => e.id === repoId) as EntityImpl | undefined;
      if (!repoImpl) continue;

      const repo = repoImpl.getComponent<KnowledgeRepositoryComponent>(CT.KnowledgeRepository);
      if (!repo) continue;

      for (const techId of techIds) {
        // Reuse event data object
        preservationEventData.civilizationId = civilizationId;
        preservationEventData.repositoryId = repoId;
        preservationEventData.technologyId = techId;
        preservationEventData.repositoryType = repo.repositoryType;
        preservationEventData.tick = tick;

        this.events.emit({
          type: 'knowledge:technology_preserved',
          source: repoId,
          data: { ...preservationEventData },
        });
      }
    }
  }

  // ========== Rediscovery ==========

  /**
   * Process a civilization's repositories for rediscovery and degradation
   */
  private processCivilizationRepositories(
    world: World,
    civId: string,
    repositories: ReadonlyArray<EntityImpl>
  ): void {
    // Get civilization's era component
    const civEntities = world.query().with(CT.TechnologyEra).executeEntities();
    let eraComponent: TechnologyEraComponent | null = null;

    for (const entity of civEntities) {
      const impl = entity as EntityImpl;
      const era = impl.getComponent<TechnologyEraComponent>(CT.TechnologyEra);
      // TODO: Match by civilizationId when available
      if (era) {
        eraComponent = era;
        break;
      }
    }

    if (!eraComponent) {
      return; // No era component found
    }

    const currentEraIndex = getEraIndex(eraComponent.currentEra);
    const lostTechs = eraComponent.lostTechnologies;

    if (lostTechs.length === 0) {
      // No lost technologies, just check degradation
      for (const repoEntity of repositories) {
        this.checkRepositoryDegradation(world, repoEntity, currentEraIndex);
      }
      return;
    }

    // Calculate total discovery bonus from all repositories
    let totalDiscoveryBonus = 0;
    for (const repoEntity of repositories) {
      const repo = repoEntity.getComponent<KnowledgeRepositoryComponent>(CT.KnowledgeRepository);
      if (repo && canPreserveKnowledge(repo)) {
        totalDiscoveryBonus += getEffectiveDiscoveryBonus(repo);
      }
    }

    // Attempt rediscovery for each lost technology
    for (const techId of lostTechs) {
      // Check if preserved in any repository
      const preservingRepo = this.findPreservingRepository(techId, repositories);

      if (preservingRepo) {
        // Higher chance if preserved
        const rediscoveryChance = BASE_REDISCOVERY_CHANCE * totalDiscoveryBonus * 2;
        if (Math.random() < rediscoveryChance) {
          this.rediscoverTechnology(
            world,
            eraComponent,
            techId,
            preservingRepo,
            'archaeological_discovery'
          );
        }
      } else {
        // Try reinvention (requires precursor techs)
        const reinventionChance = REINVENTION_CHANCE * totalDiscoveryBonus;
        if (Math.random() < reinventionChance) {
          // Pick a random repository for credit
          const randomRepo = repositories[Math.floor(Math.random() * repositories.length)];
          if (randomRepo) {
            this.rediscoverTechnology(
              world,
              eraComponent,
              techId,
              randomRepo,
              'reinvention'
            );
          }
        }
      }
    }

    // Check degradation for all repositories
    for (const repoEntity of repositories) {
      this.checkRepositoryDegradation(world, repoEntity, currentEraIndex);
    }
  }

  /**
   * Find which repository (if any) is preserving a technology
   */
  private findPreservingRepository(
    techId: string,
    repositories: ReadonlyArray<EntityImpl>
  ): EntityImpl | null {
    for (const repoEntity of repositories) {
      const repo = repoEntity.getComponent<KnowledgeRepositoryComponent>(CT.KnowledgeRepository);
      if (repo && repo.preservedTechnologies.includes(techId)) {
        return repoEntity;
      }
    }
    return null;
  }

  /**
   * Rediscover a lost technology
   */
  private rediscoverTechnology(
    world: World,
    eraComponent: TechnologyEraComponent,
    techId: string,
    repositoryEntity: EntityImpl,
    method: 'archaeological_discovery' | 'reinvention'
  ): void {
    const repo = repositoryEntity.getComponent<KnowledgeRepositoryComponent>(
      CT.KnowledgeRepository
    );
    if (!repo) return;

    // Move from lostTechnologies back to unlockedTechIds
    const index = eraComponent.lostTechnologies.indexOf(techId);
    if (index !== -1) {
      eraComponent.lostTechnologies.splice(index, 1);
    }
    eraComponent.unlockedTechIds.add(techId);

    // Remove from repository preservation
    if (method === 'archaeological_discovery') {
      removeTechnology(repo, techId);
    }

    // Update stats
    repo.rediscoveriesCount++;
    repo.lastRediscoveryAttemptTick = world.tick;

    // Emit event
    rediscoveryEventData.civilizationId = repo.civilizationId;
    rediscoveryEventData.repositoryId = repositoryEntity.id;
    rediscoveryEventData.technologyId = techId;
    rediscoveryEventData.repositoryType = repo.repositoryType;
    rediscoveryEventData.rediscoveryMethod = method;
    rediscoveryEventData.tick = world.tick;

    this.events.emit({
      type: 'knowledge:technology_rediscovered',
      source: repositoryEntity.id,
      data: { ...rediscoveryEventData },
    });
  }

  // ========== Degradation ==========

  /**
   * Check and apply repository degradation
   */
  private checkRepositoryDegradation(
    world: World,
    repositoryEntity: EntityImpl,
    currentEraIndex: number
  ): void {
    const repo = repositoryEntity.getComponent<KnowledgeRepositoryComponent>(
      CT.KnowledgeRepository
    );
    if (!repo) return;

    // Check if enough time has passed since last maintenance
    const ticksSinceLastMaintenance = world.tick - repo.lastMaintenanceTick;
    if (ticksSinceLastMaintenance < DEGRADATION_CHECK_INTERVAL) {
      return; // Not time yet
    }

    // Calculate degradation
    const degradationRate = calculateDegradationRate(repo, currentEraIndex);
    const degradationAmount = Math.floor(
      (ticksSinceLastMaintenance / DEGRADATION_CHECK_INTERVAL) * degradationRate
    );

    if (degradationAmount === 0) {
      return; // No degradation this cycle
    }

    // Apply degradation
    const oldCondition = repo.conditionLevel;
    repo.conditionLevel = Math.max(0, repo.conditionLevel - degradationAmount);
    repo.lastMaintenanceTick = world.tick;

    // Check if technologies are lost due to degradation
    let technologiesLost = 0;
    const effectiveCapacity = getEffectiveCapacity(repo);

    // If capacity reduced below current count, lose some techs
    while (repo.preservedTechnologies.length > effectiveCapacity) {
      // Remove random tech
      const randomIndex = Math.floor(Math.random() * repo.preservedTechnologies.length);
      repo.preservedTechnologies.splice(randomIndex, 1);
      technologiesLost++;
      repo.lostToDecayCount++;
    }

    // Emit degradation event if significant
    if (degradationAmount >= 5 || technologiesLost > 0) {
      degradationEventData.repositoryId = repositoryEntity.id;
      degradationEventData.civilizationId = repo.civilizationId;
      degradationEventData.conditionLevel = repo.conditionLevel;
      degradationEventData.technologiesLost = technologiesLost;
      degradationEventData.tick = world.tick;

      this.events.emit({
        type: 'knowledge:repository_degraded',
        source: repositoryEntity.id,
        data: { ...degradationEventData },
      });

      if (repo.conditionLevel === 0) {
        console.warn(
          `[KnowledgePreservation] Repository ${repositoryEntity.id} has collapsed (condition: 0)`
        );
      }
    }
  }

  // ========== Helpers ==========

  /**
   * Group repositories by civilization ID for batch processing
   */
  private groupRepositoriesByCivilization(
    repositories: ReadonlyArray<EntityImpl>
  ): Map<string, EntityImpl[]> {
    const grouped = new Map<string, EntityImpl[]>();

    for (const repoEntity of repositories) {
      const repo = repoEntity.getComponent<KnowledgeRepositoryComponent>(CT.KnowledgeRepository);
      if (!repo) continue;

      const civId = repo.civilizationId;
      if (!grouped.has(civId)) {
        grouped.set(civId, []);
      }
      grouped.get(civId)!.push(repoEntity);
    }

    return grouped;
  }
}
