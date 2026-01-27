/**
 * ArchaeologySystem - Excavate ruins and discover artifacts
 *
 * This system handles:
 * - Creating archaeological sites from megastructure ruins
 * - Processing excavation progress based on assigned workers
 * - Rolling for artifact discoveries based on progress
 * - Handling reverse engineering of artifacts
 * - Unlocking lost technologies through successful reverse engineering
 *
 * Priority: 235 (after KnowledgePreservationSystem)
 * Throttle: 200 ticks (10 seconds at 20 TPS)
 *
 * Integration:
 * - Listens for 'megastructure_collapsed' events to create sites
 * - Works with TechnologyEraComponent for tech level checks
 * - Emits events for discoveries and technology recovery
 *
 * @see ArchaeologicalSiteComponent
 * @see MegastructureComponent
 * @see TechnologyEraComponent
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType as CT_Type } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type {
  ArchaeologicalSiteComponent,
  Artifact,
  ExcavationPhase,
} from '../components/ArchaeologicalSiteComponent.js';
import {
  createArchaeologicalSiteComponent,
  hasDiscoveriesRemaining,
  isExcavationActive,
  isSiteExhausted,
  addDiscoveredArtifact,
  advanceExcavationPhase,
  getArtifactById,
  updateArtifactProgress,
  calculateAgeDifficultyModifier,
} from '../components/ArchaeologicalSiteComponent.js';
import type { MegastructureComponent } from '../components/MegastructureComponent.js';
import type { TechnologyEraComponent, TechnologyEra } from '../components/TechnologyEraComponent.js';
import { getEraIndex, getEraByIndex } from '../components/TechnologyEraComponent.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Excavation phase duration in ticks
 */
const PHASE_DURATIONS: Record<ExcavationPhase, number> = {
  undiscovered: 0,     // Instant transition
  surveyed: 1000,      // 50 seconds (mapping and initial survey)
  excavating: 5000,    // 250 seconds (main excavation work)
  analyzed: 2000,      // 100 seconds (cataloguing artifacts)
  exhausted: 0,        // Terminal state
};

/**
 * Workers required for each excavation phase
 */
const WORKERS_REQUIRED: Record<ExcavationPhase, number> = {
  undiscovered: 0,
  surveyed: 2,         // Small survey team
  excavating: 5,       // Full excavation crew
  analyzed: 3,         // Analysis team
  exhausted: 0,
};

/**
 * Progress per tick per worker (base rate)
 */
const PROGRESS_PER_WORKER_PER_TICK = 0.1;

/**
 * Discovery chance per excavation progress point (0-1)
 */
const DISCOVERY_CHANCE_PER_PROGRESS = 0.005;

/**
 * Reverse engineering progress per tick per scientist
 */
const REVERSE_ENGINEERING_RATE = 0.05;

/**
 * Ticks per game year (20 TPS)
 */
const TICKS_PER_YEAR = 365 * 24 * 60 * 3;

// ============================================================================
// FAST PRNG
// ============================================================================

/**
 * Fast xorshift32 PRNG for discovery rolls
 */
class FastRNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (x >>> 0) / 0x100000000;
  }
}

// ============================================================================
// SYSTEM
// ============================================================================

export class ArchaeologySystem extends BaseSystem {
  public readonly id: SystemId = 'archaeology' as SystemId;
  public readonly priority: number = 235;
  public readonly requiredComponents: ReadonlyArray<CT_Type> = [CT.ArchaeologicalSite];
  public readonly activationComponents = ['archaeological_site'] as const;
  protected readonly throttleInterval = 200; // Every 10 seconds at 20 TPS

  // PERF: Entity caching for fast lookups
  private siteCache = new Map<string, ArchaeologicalSiteComponent>();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_INVALIDATION_TICKS = 1000; // Re-scan every 50 seconds

  // PERF: Fast PRNG for discovery rolls
  private readonly rng = new FastRNG();

  // Reusable working objects - zero allocations in hot path
  private readonly workingPotentialTechs: string[] = [];

  protected onInitialize(world: WorldMutator, eventBus: EventBus): void {
    this.world = world;

    // Listen for megastructure collapse events to create archaeological sites
    eventBus.on('megastructure_collapsed', (event) => {
      this.handleMegastructureCollapse(world, event.data);
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    const { activeEntities, world } = ctx;
    const currentTick = world.tick;

    // Refresh entity cache periodically
    if (currentTick - this.lastCacheUpdate > this.CACHE_INVALIDATION_TICKS) {
      this.rebuildSiteCache(activeEntities);
      this.lastCacheUpdate = currentTick;
    }

    // Process all archaeological sites
    for (const entity of activeEntities) {
      const impl = entity as EntityImpl;
      const site = this.siteCache.get(impl.id);

      if (!site) continue;

      // Update site age
      site.ageInTicks = currentTick - site.createdAtTick;

      // Skip exhausted sites
      if (isSiteExhausted(site)) continue;

      // Process excavation if active
      if (isExcavationActive(site)) {
        this.processExcavation(ctx, impl, site, currentTick);
      }

      // Check for phase advancement
      if (site.excavationProgress >= 100) {
        this.checkPhaseAdvancement(ctx, impl, site, currentTick);
      }
    }
  }

  /**
   * Rebuild the archaeological site cache
   */
  private rebuildSiteCache(entities: readonly Entity[]): void {
    this.siteCache.clear();
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const site = impl.getComponent<ArchaeologicalSiteComponent>(CT.ArchaeologicalSite);
      if (site) {
        this.siteCache.set(impl.id, site);
      }
    }
  }

  /**
   * Handle megastructure collapse event by creating archaeological site
   */
  private handleMegastructureCollapse(
    world: World,
    data: {
      entityId: string;
      structureType: string;
      archaeologicalValue: number;
      controllingFactionId?: string;
    }
  ): void {
    const megaEntity = world.getEntity(data.entityId) as EntityImpl | null;
    if (!megaEntity) return;

    const mega = megaEntity.getComponent<MegastructureComponent>(CT.Megastructure);
    if (!mega) return;

    // Determine origin era from megastructure tech level
    // Megastructures are typically high-tech eras (interplanetary+)
    const originEra = this.determineMegastructureEra(mega.structureType);

    // Generate potential discoveries based on megastructure type
    const potentialDiscoveries = this.generatePotentialDiscoveries(mega.structureType, originEra);

    // Create archaeological site component
    const siteId = `site_${mega.megastructureId}_${Date.now()}`;
    const siteName = `${mega.name} Ruins`;

    const siteComponent = createArchaeologicalSiteComponent({
      siteId,
      siteName,
      siteType: 'megastructure_ruin',
      originEra,
      originEntityId: data.entityId,
      currentTick: world.tick,
      archaeologicalValue: data.archaeologicalValue,
      potentialDiscoveries,
    });

    // Add archaeological site component to the megastructure entity
    megaEntity.addComponent(siteComponent);

    // Emit site discovered event
    world.eventBus.emit({
      type: 'archaeology:site_discovered',
      source: megaEntity.id,
      data: {
        siteId,
        siteName,
        siteType: 'megastructure_ruin',
        originEra,
        archaeologicalValue: data.archaeologicalValue,
        potentialDiscoveries: potentialDiscoveries.length,
      },
    });
  }

  /**
   * Determine era from megastructure type
   */
  private determineMegastructureEra(structureType: string): TechnologyEra {
    // Map megastructure types to technology eras
    switch (structureType) {
      case 'space_station':
        return 'fusion';
      case 'oneill_cylinder':
        return 'interplanetary';
      case 'dyson_swarm':
      case 'stellar_engine':
        return 'interstellar';
      case 'wormhole_gate':
      case 'ringworld_segment':
        return 'transgalactic';
      case 'matrioshka_brain':
        return 'post_singularity';
      default:
        return 'interplanetary'; // Default to interplanetary era
    }
  }

  /**
   * Generate potential technology discoveries for a megastructure type
   */
  private generatePotentialDiscoveries(
    structureType: string,
    originEra: TechnologyEra
  ): string[] {
    const discoveries: string[] = [];

    // Base technologies for all megastructures
    discoveries.push('advanced_materials', 'fusion_power', 'quantum_computing');

    // Type-specific technologies
    switch (structureType) {
      case 'space_station':
        discoveries.push('closed_loop_ecosystem', 'artificial_gravity', 'radiation_shielding');
        break;
      case 'oneill_cylinder':
        discoveries.push('megastructure_engineering', 'orbital_construction', 'terraforming');
        break;
      case 'dyson_swarm':
        discoveries.push('solar_collector_tech', 'space_based_power', 'swarm_coordination');
        break;
      case 'wormhole_gate':
        discoveries.push('exotic_matter_manipulation', 'spacetime_engineering', 'ftl_navigation');
        break;
      case 'stellar_engine':
        discoveries.push('stellar_manipulation', 'gravity_control', 'stellar_cartography');
        break;
      case 'ringworld_segment':
        discoveries.push('ringworld_engineering', 'planetary_scale_construction', 'mass_drivers');
        break;
      case 'matrioshka_brain':
        discoveries.push('computational_substrate', 'consciousness_transfer', 'neural_architecture');
        break;
    }

    return discoveries;
  }

  /**
   * Process excavation progress
   */
  private processExcavation(
    ctx: SystemContext,
    siteEntity: EntityImpl,
    site: ArchaeologicalSiteComponent,
    tick: number
  ): void {
    const workersRequired = WORKERS_REQUIRED[site.excavationPhase];

    // Early exit if no workers assigned
    if (site.workersAssigned <= 0) return;

    // Calculate effective workers (capped at requirement)
    const effectiveWorkers = Math.min(site.workersAssigned, workersRequired);

    // Calculate age difficulty modifier
    const ageInYears = site.ageInTicks / TICKS_PER_YEAR;
    const ageDifficultyMod = calculateAgeDifficultyModifier(ageInYears);

    // Calculate progress per tick
    const baseProgress = PROGRESS_PER_WORKER_PER_TICK * effectiveWorkers;
    const difficultyPenalty = 1 / (site.excavationDifficulty * ageDifficultyMod);
    const progressDelta = baseProgress * difficultyPenalty;

    // Update excavation progress
    site.excavationProgress = Math.min(100, site.excavationProgress + progressDelta);

    // Update work hours invested
    site.workHoursInvested += effectiveWorkers * this.throttleInterval / 60; // Convert ticks to hours

    // Update last excavation tick
    site.lastExcavationTick = tick;

    // Roll for discoveries during excavation phase
    if (site.excavationPhase === 'excavating' && hasDiscoveriesRemaining(site)) {
      this.rollForDiscovery(ctx, siteEntity, site, tick, progressDelta);
    }
  }

  /**
   * Roll for artifact discovery based on excavation progress
   */
  private rollForDiscovery(
    ctx: SystemContext,
    siteEntity: EntityImpl,
    site: ArchaeologicalSiteComponent,
    tick: number,
    progressDelta: number
  ): void {
    // Discovery chance scales with progress delta
    const discoveryChance = progressDelta * DISCOVERY_CHANCE_PER_PROGRESS;

    // PERF: Use fast PRNG
    const roll = this.rng.next();

    if (roll < discoveryChance && site.potentialDiscoveries.length > 0) {
      // Randomly select a potential discovery
      const discoveryIndex = Math.floor(this.rng.next() * site.potentialDiscoveries.length);
      const techId = site.potentialDiscoveries[discoveryIndex];

      if (!techId) {
        throw new Error(`No technology at index ${discoveryIndex}`);
      }

      // Remove from potential discoveries
      site.potentialDiscoveries.splice(discoveryIndex, 1);

      // Create artifact
      const artifact = this.createArtifact(techId, site.originEra, tick);

      // Add to discovered artifacts
      addDiscoveredArtifact(site, artifact, tick);

      // Emit artifact found event
      ctx.emit(
        'archaeology:artifact_found',
        {
          siteId: site.siteId,
          siteName: site.siteName,
          artifactId: artifact.id,
          artifactName: artifact.name,
          originTech: techId,
          originEra: site.originEra,
          condition: artifact.condition,
          complexity: artifact.complexity,
        },
        siteEntity.id
      );

      // Emit excavation started event (first discovery)
      if (site.discoveredArtifacts.length === 1) {
        ctx.emit(
          'archaeology:excavation_started',
          {
            siteId: site.siteId,
            siteName: site.siteName,
            siteType: site.siteType,
            workersAssigned: site.workersAssigned,
            excavationDifficulty: site.excavationDifficulty,
          },
          siteEntity.id
        );
      }
    }
  }

  /**
   * Create an artifact from a technology ID
   */
  private createArtifact(
    techId: string,
    originEra: TechnologyEra,
    tick: number
  ): Artifact {
    const artifactId = `artifact_${techId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Generate artifact name and description based on tech ID
    const name = this.generateArtifactName(techId);
    const description = this.generateArtifactDescription(techId, originEra);

    // Calculate artifact condition (random degradation)
    const baseCondition = 0.5 + this.rng.next() * 0.5; // 0.5-1.0

    // Calculate complexity based on era (higher eras = more complex)
    const eraIndex = getEraIndex(originEra);
    const complexity = Math.min(10, 1 + eraIndex);

    return {
      id: artifactId,
      name,
      description,
      originTech: techId,
      originEra,
      reverseEngineeringProgress: 0,
      reverseEngineered: false,
      discoveredAtTick: tick,
      condition: baseCondition,
      complexity,
    };
  }

  /**
   * Generate artifact name from tech ID
   */
  private generateArtifactName(techId: string): string {
    // Convert tech_id_format to "Tech ID Format"
    const words = techId.split('_');
    const capitalized = words.map(w => w.charAt(0).toUpperCase() + w.slice(1));
    return capitalized.join(' ') + ' Artifact';
  }

  /**
   * Generate artifact description
   */
  private generateArtifactDescription(techId: string, era: TechnologyEra): string {
    return `An ancient ${era} era artifact related to ${techId.replace(/_/g, ' ')}. Analysis required to unlock its secrets.`;
  }

  /**
   * Check if excavation phase should advance
   */
  private checkPhaseAdvancement(
    ctx: SystemContext,
    siteEntity: EntityImpl,
    site: ArchaeologicalSiteComponent,
    tick: number
  ): void {
    // Advance to next phase
    advanceExcavationPhase(site, tick);

    // Emit phase advancement event
    ctx.emit(
      'archaeology:phase_advanced',
      {
        siteId: site.siteId,
        siteName: site.siteName,
        newPhase: site.excavationPhase,
        progress: site.excavationProgress,
      },
      siteEntity.id
    );

    // Check if site is now exhausted
    if (isSiteExhausted(site)) {
      ctx.emit(
        'archaeology:site_exhausted',
        {
          siteId: site.siteId,
          siteName: site.siteName,
          totalArtifacts: site.discoveredArtifacts.length,
          workHoursInvested: site.workHoursInvested,
        },
        siteEntity.id
      );
    }
  }

  /**
   * Process reverse engineering of artifacts
   * Called by external systems (e.g., TechnologyUnlockSystem)
   */
  public processReverseEngineering(
    world: World,
    siteEntity: EntityImpl,
    artifactId: string,
    scientistsAssigned: number
  ): void {
    const site = siteEntity.getComponent<ArchaeologicalSiteComponent>(CT.ArchaeologicalSite);
    if (!site) return;

    const artifact = getArtifactById(site, artifactId);
    if (!artifact || artifact.reverseEngineered) return;

    // Calculate progress based on scientists, artifact condition, and complexity
    const baseProgress = REVERSE_ENGINEERING_RATE * scientistsAssigned;
    const conditionMod = artifact.condition; // Better condition = faster progress
    const complexityPenalty = 1 / artifact.complexity;
    const progressDelta = baseProgress * conditionMod * complexityPenalty;

    // Update artifact progress
    updateArtifactProgress(artifact, progressDelta);

    // Check if reverse engineering completed
    if (artifact.reverseEngineered) {
      this.handleTechnologyRecovered(world, siteEntity, site, artifact);
    }
  }

  /**
   * Handle successful technology recovery
   */
  private handleTechnologyRecovered(
    world: World,
    siteEntity: EntityImpl,
    site: ArchaeologicalSiteComponent,
    artifact: Artifact
  ): void {
    // Record discovery event
    site.discoveryEvents.push({
      tick: world.tick,
      eventType: 'technology_unlocked',
      description: `Technology recovered: ${artifact.originTech}`,
      artifactId: artifact.id,
      techId: artifact.originTech,
    });

    // Emit technology recovered event
    world.eventBus.emit({
      type: 'archaeology:technology_recovered',
      source: siteEntity.id,
      data: {
        siteId: site.siteId,
        siteName: site.siteName,
        artifactId: artifact.id,
        artifactName: artifact.name,
        techId: artifact.originTech,
        originEra: artifact.originEra,
        reverseEngineeringProgress: artifact.reverseEngineeringProgress,
      },
    });
  }
}
