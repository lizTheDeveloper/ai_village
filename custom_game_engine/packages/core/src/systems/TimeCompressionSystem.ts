/**
 * TimeCompressionSystem - Elastic time control for grand strategy
 *
 * Enables fast-forward mode and time jumps spanning millennia by controlling
 * simulation speed based on zoom level and player intent.
 *
 * Time Modes:
 * 1. Real-Time (1x-10x): Full ECS simulation, watch individual agents
 * 2. Fast-Forward (100x-100000x): Statistical simulation, civilizations evolve
 * 3. Time Jump: Instant skip to target tick via LLM trajectory generation
 *
 * Speed Limits by Tier:
 * - Chunk/Zone: max 10x (individual physics)
 * - Region: max 100x (economy simulation)
 * - Planet: max 1000x (politics, nations)
 * - System: max 10000x (interstellar trade)
 * - Galaxy: max 100000x (cosmic evolution)
 *
 * Dependencies:
 * - TimeSystem (priority 3) - Core time tracking
 * - MultiverseCoordinator - Universe time scale management
 * - SimulationController (hierarchy-simulator) - Abstract tier updates
 *
 * See openspec/specs/grand-strategy/03-TIME-SCALING.md for full specification.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType, Tick } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { TimeCompressionComponent } from '../components/TimeCompressionComponent.js';
import { TIME_SCALE_LIMITS } from '../components/TimeCompressionComponent.js';
import type {
  TimeCompressionSnapshotComponent,
  EraSnapshot,
  SoulTrajectory,
} from '../components/TimeCompressionSnapshotComponent.js';
import {
  createEraSnapshot,
  createSoulTrajectory,
  addEraSnapshot,
} from '../components/TimeCompressionSnapshotComponent.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';
import type { SoulLinkComponent } from '../components/SoulLinkComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Ticks per century for era tracking (1 tick = 1 minute game-time) */
const TICKS_PER_CENTURY = 525600 * 100; // 52,560,000 ticks per century

/** Time scale threshold for statistical mode (above 1000x) */
const STATISTICAL_MODE_THRESHOLD = 1000;

/** Ticks per year for time jump calculations */
const TICKS_PER_YEAR = 525600;

/**
 * TimeCompressionSystem - Control simulation speed across cosmic scales
 *
 * Priority: 5 (very early, before most systems but after Time)
 * This system must run early to set time scale before other systems process
 */
export class TimeCompressionSystem extends BaseSystem {
  public readonly id: SystemId = 'time_compression';
  public readonly priority: number = 5; // Very early, before most systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.TimeCompression];
  // Only run when time compression components exist (O(1) activation check)
  public readonly activationComponents = [CT.TimeCompression] as const;
  protected readonly throttleInterval = 0; // EVERY_TICK - critical for time control

  /**
   * Systems that must run before this one.
   * @see TimeSystem (priority 3) - Provides time tracking
   */
  public readonly dependsOn = ['time'] as const;

  // ========== Cached State (Performance Optimization) ==========

  /** Cached TimeCompression entity ID (singleton pattern) */
  private timeCompressionEntityId: string | null = null;

  /** Last era value for change detection */
  private lastEra: number = 0;

  /** Last statistical mode for change detection */
  private lastStatisticalMode: boolean = false;

  /** Cached TimeCompressionSnapshot entity ID (singleton pattern) */
  private snapshotEntityId: string | null = null;

  /** Pending trajectory requests (soul ID -> promise) */
  private pendingTrajectories: Map<string, Promise<SoulTrajectory | null>> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const { world, tick } = ctx;

    // Cache singleton entity ID on first run
    if (this.timeCompressionEntityId === null) {
      const entities = world.query().with(CT.TimeCompression).executeEntities();
      if (entities.length === 0) return; // No time compression entity
      this.timeCompressionEntityId = entities[0]!.id;
    }

    // Get entity (cached lookup)
    const entity = world.getEntity(this.timeCompressionEntityId);
    if (!entity) {
      this.timeCompressionEntityId = null; // Reset cache if entity was removed
      return;
    }

    const impl = entity as EntityImpl;
    const compression = impl.getComponent<TimeCompressionComponent>(CT.TimeCompression);

    if (!compression) {
      return;
    }

    // Early exit: Skip if paused
    if (compression.isPaused) {
      return;
    }

    // Early exit: Check for time jump in progress
    if (compression.jumpInProgress && compression.targetTick !== null) {
      this.processTimeJump(ctx, impl, compression);
      return;
    }

    // Update era tracking (optimized with pre-computed constant)
    const currentEra = Math.floor(Number(tick) / TICKS_PER_CENTURY);

    if (currentEra !== this.lastEra) {
      // Era changed
      impl.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
        ...current,
        currentEra,
      }));

      // Emit era change event
      ctx.emit('time:era_changed', {
        era: currentEra,
        previousEra: this.lastEra,
        tick: Number(tick),
      }, entity.id);

      this.lastEra = currentEra;
    }

    // Update statistical mode based on time scale (optimized threshold comparison)
    const shouldBeStatistical = compression.currentTimeScale > STATISTICAL_MODE_THRESHOLD;

    if (shouldBeStatistical !== this.lastStatisticalMode) {
      impl.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
        ...current,
        statisticalMode: shouldBeStatistical,
      }));

      // Emit mode change event
      ctx.emit('time:simulation_mode_changed', {
        mode: shouldBeStatistical ? 'statistical' : 'ecs',
        timeScale: compression.currentTimeScale,
      }, entity.id);

      this.lastStatisticalMode = shouldBeStatistical;
    }
  }

  /**
   * Process time jump to target tick
   * Uses statistical simulation + LLM trajectory generation
   */
  private processTimeJump(
    ctx: SystemContext,
    entity: EntityImpl,
    compression: TimeCompressionComponent
  ): void {
    if (compression.targetTick === null) {
      return;
    }

    const currentTick = ctx.tick;
    const targetTick = compression.targetTick;

    // Calculate years to jump (use pre-computed constant)
    const yearsToJump = Number(targetTick - currentTick) / TICKS_PER_YEAR;

    // Emit jump started event (only once)
    if (compression.jumpInProgress && currentTick < targetTick) {
      ctx.emit('time:jump_started', {
        startTick: Number(currentTick),
        targetTick: Number(targetTick),
        years: yearsToJump,
      }, entity.id);

      // Generate soul trajectories and era snapshot asynchronously
      this.generateTimeJumpNarratives(ctx, entity, compression, yearsToJump).catch((error) => {
        console.error('[TimeCompressionSystem] Failed to generate time jump narratives:', error);
      });

      // Mark jump as complete (narratives generate in background)
      entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
        ...current,
        jumpInProgress: false,
        targetTick: null,
      }));

      // Emit jump completed event
      ctx.emit('time:jump_completed', {
        startTick: Number(currentTick),
        endTick: Number(targetTick),
        years: yearsToJump,
      }, entity.id);
    }
  }

  /**
   * Set time scale (public API for external systems)
   * Clamps to max allowed for current tier
   */
  public setTimeScale(
    entity: EntityImpl,
    newScale: number
  ): void {
    const compression = entity.getComponent<TimeCompressionComponent>(CT.TimeCompression);
    if (!compression) {
      throw new Error(`Entity ${entity.id} missing TimeCompressionComponent`);
    }

    // Clamp to allowed range for current tier
    const clampedScale = Math.max(1, Math.min(compression.maxTimeScale, newScale));

    entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
      ...current,
      currentTimeScale: clampedScale,
    }));

    // Emit scale changed event
    // Note: Using world.eventBus directly since we don't have SystemContext here
    // This is called from external code (UI, admin panel, etc.)
  }

  /**
   * Request time jump to target tick
   * Validates target is in the future and starts jump process
   */
  public requestTimeJump(
    entity: EntityImpl,
    targetTick: Tick,
    currentTick: Tick
  ): void {
    const compression = entity.getComponent<TimeCompressionComponent>(CT.TimeCompression);
    if (!compression) {
      throw new Error(`Entity ${entity.id} missing TimeCompressionComponent`);
    }

    // Validate target is in future
    if (targetTick <= currentTick) {
      throw new Error(`Target tick ${targetTick} must be greater than current tick ${currentTick}`);
    }

    // Calculate years to jump (use pre-computed constant)
    const yearsToJump = Number(targetTick - currentTick) / TICKS_PER_YEAR;

    // Recommended maximum: 10,000-year jumps (from spec)
    if (yearsToJump > 10000) {
      console.warn(
        `[TimeCompressionSystem] Jumping ${yearsToJump.toFixed(0)} years exceeds recommended 10,000-year limit. ` +
        `Consider splitting into multiple jumps for better performance.`
      );
    }

    entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
      ...current,
      targetTick,
      jumpInProgress: true,
    }));
  }

  /**
   * Pause time progression
   */
  public pauseTime(entity: EntityImpl): void {
    const compression = entity.getComponent<TimeCompressionComponent>(CT.TimeCompression);
    if (!compression) {
      throw new Error(`Entity ${entity.id} missing TimeCompressionComponent`);
    }

    entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
      ...current,
      isPaused: true,
    }));
  }

  /**
   * Resume time progression
   */
  public resumeTime(entity: EntityImpl): void {
    const compression = entity.getComponent<TimeCompressionComponent>(CT.TimeCompression);
    if (!compression) {
      throw new Error(`Entity ${entity.id} missing TimeCompressionComponent`);
    }

    entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
      ...current,
      isPaused: false,
    }));
  }

  /**
   * Update tier and adjust max time scale accordingly
   */
  public setTier(
    entity: EntityImpl,
    tier: 'chunk' | 'zone' | 'region' | 'planet' | 'system' | 'sector' | 'galaxy'
  ): void {
    const compression = entity.getComponent<TimeCompressionComponent>(CT.TimeCompression);
    if (!compression) {
      throw new Error(`Entity ${entity.id} missing TimeCompressionComponent`);
    }

    const newMaxScale = TIME_SCALE_LIMITS[tier] || 10;

    entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
      ...current,
      currentTier: tier,
      maxTimeScale: newMaxScale,
      // Clamp current scale if it exceeds new max
      currentTimeScale: Math.min(current.currentTimeScale, newMaxScale),
    }));
  }

  /**
   * Generate time jump narratives for souls and create era snapshot
   * This runs asynchronously and uses LLM to generate compressed histories
   */
  private async generateTimeJumpNarratives(
    ctx: SystemContext,
    _compressionEntity: EntityImpl,
    compression: TimeCompressionComponent,
    yearsToJump: number
  ): Promise<void> {
    const { world, tick } = ctx;
    const startTick = Number(tick);
    const targetTick = compression.targetTick ? Number(compression.targetTick) : startTick;

    // Get or create snapshot entity
    if (this.snapshotEntityId === null) {
      const snapshotEntities = world
        .query()
        .with(CT.TimeCompressionSnapshot)
        .executeEntities();

      if (snapshotEntities.length === 0) {
        // Create snapshot entity
        const snapshotEntity = world.createEntity() as EntityImpl;
        snapshotEntity.addComponent({
          type: 'time_compression_snapshot',
          version: 1,
          snapshots: [],
          totalTimeJumps: 0,
          totalYearsCompressed: 0,
        } as TimeCompressionSnapshotComponent);
        this.snapshotEntityId = snapshotEntity.id;
      } else {
        this.snapshotEntityId = snapshotEntities[0]!.id;
      }
    }

    const snapshotEntity = world.getEntity(this.snapshotEntityId) as EntityImpl | null;
    if (!snapshotEntity) {
      console.error('[TimeCompressionSystem] Failed to get snapshot entity');
      return;
    }

    // Find all soul entities to generate trajectories
    const soulEntities = world
      .query()
      .with(CT.SoulIdentity)
      .executeEntities();

    const trajectoryPromises: Promise<SoulTrajectory | null>[] = [];

    // Generate trajectory for each soul using LLM
    for (const soulEntity of soulEntities) {
      const trajectoryPromise = this.generateSoulTrajectory(
        world,
        soulEntity,
        startTick,
        targetTick,
        yearsToJump
      );
      trajectoryPromises.push(trajectoryPromise);
      this.pendingTrajectories.set(soulEntity.id, trajectoryPromise);
    }

    // Wait for all trajectories to complete
    const trajectories = (await Promise.all(trajectoryPromises)).filter(
      (t): t is SoulTrajectory => t !== null
    );

    // Clear pending trajectories
    this.pendingTrajectories.clear();

    // Generate era snapshot
    const eraSnapshot = this.createEraSnapshotData(
      compression.currentEra,
      startTick,
      targetTick,
      yearsToJump,
      world,
      trajectories
    );

    // Add snapshot to component
    const snapshotComp = snapshotEntity.getComponent<TimeCompressionSnapshotComponent>(
      CT.TimeCompressionSnapshot
    );
    if (snapshotComp) {
      const updated = addEraSnapshot(snapshotComp, eraSnapshot);
      (snapshotEntity as EntityImpl).updateComponent<TimeCompressionSnapshotComponent>(
        CT.TimeCompressionSnapshot,
        () => updated
      );

      // Emit event for snapshot creation
      ctx.emit('time:era_snapshot_created', {
        eraNumber: eraSnapshot.eraNumber,
        eraName: eraSnapshot.eraName,
        yearsCovered: yearsToJump,
        soulCount: trajectories.length,
      } as { eraNumber: number; eraName: string; yearsCovered: number; soulCount: number }, snapshotEntity.id);
    }
  }

  /**
   * Generate trajectory for a single soul using LLM
   *
   * INTEGRATION PATTERN (ready to use):
   * 1. Import TrajectoryPromptBuilder from '@ai-village/llm'
   * 2. Get LLMDecisionQueue instance from service registry
   * 3. Build prompt using buildLifeTrajectoryPrompt() or buildSoulTrajectoryPrompt()
   * 4. Queue LLM request with appropriate priority
   * 5. Parse response using parseLifeTrajectoryResponse() or parseTrajectoryResult()
   *
   * The TrajectoryPromptBuilder provides:
   * - buildLifeTrajectoryPrompt(): Full trajectory with milestones, death handling
   * - buildSoulTrajectoryPrompt(): Simpler trajectory for basic use
   * - buildMajorEventsPrompt(): Civilization-wide events during time jump
   * - calculateLifeExpectancy(): Tech-level-aware life expectancy
   * - parseLifeTrajectoryResponse(): Parse LifeTrajectory with milestones
   * - parseTrajectoryResult(): Parse basic TrajectoryResult
   * - parseMajorEventsResponse(): Parse major historical events
   *
   * @see packages/llm/src/TrajectoryPromptBuilder.ts
   */
  private async generateSoulTrajectory(
    world: World,
    soulEntity: { id: string; getComponent: (type: ComponentType) => unknown },
    startTick: number,
    endTick: number,
    yearsCovered: number
  ): Promise<SoulTrajectory | null> {
    const soulIdentity = soulEntity.getComponent(CT.SoulIdentity) as
      | SoulIdentityComponent
      | undefined;

    if (!soulIdentity) {
      return null;
    }

    // TODO: Full LLM integration - Replace placeholder with actual LLM call
    // Example integration code:
    /*
    import { TrajectoryPromptBuilder, LLMDecisionQueue } from '@ai-village/llm';

    const trajectoryBuilder = new TrajectoryPromptBuilder();
    const llmQueue = getLLMDecisionQueue(); // Get from service registry

    // Get current age of soul agent
    const agentComp = soulEntity.getComponent(CT.Agent) as AgentComponent | undefined;
    const currentAge = agentComp?.age || 25; // Default if age not tracked

    // Estimate tech level from world state
    const techLevel = this.estimateTechnologyLevel(world);

    // Build comprehensive prompt with life expectancy and death handling
    const prompt = trajectoryBuilder.buildLifeTrajectoryPrompt(
      {
        soulEntity: soulEntity as Entity,
        startTick,
        endTick,
        yearsCovered,
        world,
      },
      currentAge,
      techLevel
    );

    // Queue LLM request (returns immediately, processes async)
    const response = await llmQueue.requestDecision(
      `trajectory_${soulEntity.id}`,
      prompt
    );

    // Parse life trajectory with milestones and death state
    const lifeTrajectory = trajectoryBuilder.parseLifeTrajectoryResponse(
      soulEntity.id,
      response,
      startTick,
      endTick
    );

    if (!lifeTrajectory) {
      console.warn(`[TimeCompressionSystem] Failed to parse trajectory for soul ${soulEntity.id}`);
      return this.generatePlaceholderTrajectory(soulEntity.id, soulIdentity, yearsCovered);
    }

    // Convert LifeTrajectory to SoulTrajectory format
    return createSoulTrajectory({
      soulId: soulEntity.id,
      soulName: soulIdentity.soulName,
      narrative: lifeTrajectory.milestones.map(m => `Year ${m.year}: ${m.event}`).join('\n'),
      majorEvents: lifeTrajectory.milestones.map(m => m.event),
      characterDevelopment: lifeTrajectory.endState.alive
        ? 'Continued growth and development'
        : `Life ended: ${lifeTrajectory.endState.causeOfDeath || 'unknown cause'}`,
      skillsGained: [],
      relationshipChanges: [],
      achievements: lifeTrajectory.endState.achievements,
    });
    */

    // Placeholder implementation until LLM integration is complete
    const trajectory = this.generatePlaceholderTrajectory(
      soulEntity.id,
      soulIdentity,
      yearsCovered
    );

    return trajectory;
  }

  /**
   * Estimate technology level from world state
   * Used for calculating life expectancy during time jumps
   */
  private estimateTechnologyLevel(world: World): number {
    // TODO: Implement based on actual technology tracking
    // For now, estimate based on building types, skills, etc.

    // Count advanced buildings as proxy for tech level
    const buildings = world.query().with(CT.Building).executeEntities();
    const buildingCount = buildings.length;

    // Simple heuristic: more buildings = higher tech
    // Tech level 0-10 scale
    if (buildingCount < 5) return 0; // Stone age
    if (buildingCount < 20) return 2; // Bronze age
    if (buildingCount < 50) return 4; // Iron age
    if (buildingCount < 100) return 6; // Medieval
    if (buildingCount < 200) return 8; // Renaissance
    return 10; // Industrial/Modern

    // Better implementation would check:
    // - TechnologyUnlockComponent
    // - Building types (forge = higher tech than hut)
    // - Agent skill levels (advanced crafting = higher tech)
    // - Population density (cities = higher tech)
  }

  /**
   * Generate a placeholder trajectory (used until LLM integration is complete)
   */
  private generatePlaceholderTrajectory(
    soulId: string,
    identity: SoulIdentityComponent,
    years: number
  ): SoulTrajectory {
    const { soulName, purpose, coreInterests, archetype } = identity;

    // Generate basic narrative based on purpose and interests
    const mainInterest = coreInterests[0] || 'exploration';
    const narrative = `During these ${years} years, ${soulName} pursued their purpose: "${purpose}". ` +
      `As a ${archetype || 'wandering'} soul, they focused primarily on ${mainInterest}, ` +
      `experiencing growth and challenges along the way.`;

    const majorEvents = [
      `Significant progress in ${mainInterest}`,
      `Encountered a defining challenge related to their purpose`,
      `Formed new relationships with others sharing their interests`,
    ];

    const characterDevelopment = `Grew in wisdom and understanding of their purpose, ` +
      `developing a deeper connection to ${mainInterest}.`;

    const skillsGained = coreInterests.slice(0, 2).map(interest => `Advanced ${interest}`);

    const relationshipChanges = [
      `Connected with others who share interest in ${mainInterest}`,
    ];

    const achievements = [
      `Made meaningful progress toward fulfilling their purpose`,
    ];

    return createSoulTrajectory({
      soulId,
      soulName,
      narrative,
      majorEvents,
      characterDevelopment,
      skillsGained,
      relationshipChanges,
      achievements,
    });
  }

  /**
   * Create era snapshot data structure
   */
  private createEraSnapshotData(
    eraNumber: number,
    startTick: number,
    endTick: number,
    yearsCovered: number,
    world: World,
    soulTrajectories: SoulTrajectory[]
  ): EraSnapshot {
    // Get population count
    const populationAtEnd = world.query().with(CT.Agent).executeEntities().length;

    // TODO: Integrate with LLM for era name and summary generation
    // For now, generate placeholder era data
    const eraName = this.generateEraName(eraNumber, yearsCovered);
    const summary = this.generateEraSummary(yearsCovered, populationAtEnd, soulTrajectories);

    const majorEvents = [
      'Population growth and settlement expansion',
      'Technological and cultural advancement',
      'Formation of new social structures',
    ];

    const culturalDevelopments = [
      'New traditions and practices emerged',
      'Knowledge accumulated through experience',
    ];

    const notableFigures = soulTrajectories
      .slice(0, 3)
      .map(t => `${t.soulName} - ${t.achievements[0] || 'influential in their community'}`);

    return createEraSnapshot({
      eraNumber,
      eraName,
      startTick,
      endTick,
      yearsCovered,
      summary,
      majorEvents,
      culturalDevelopments,
      notableFigures,
      conflicts: [],
      legacy: `This era laid the foundation for future generations' development.`,
      populationAtEnd,
      technologyLevel: 'Developing civilization',
      soulTrajectories,
    });
  }

  /**
   * Generate era name based on era number and duration
   */
  private generateEraName(eraNumber: number, years: number): string {
    if (years < 10) {
      return `Era ${eraNumber}: The Brief Passage`;
    } else if (years < 50) {
      return `Era ${eraNumber}: The Years of Growth`;
    } else if (years < 100) {
      return `Era ${eraNumber}: The Age of Development`;
    } else if (years < 500) {
      return `Era ${eraNumber}: The Century of Change`;
    } else {
      return `Era ${eraNumber}: The Long Epoch`;
    }
  }

  /**
   * Generate era summary
   */
  private generateEraSummary(
    years: number,
    population: number,
    trajectories: SoulTrajectory[]
  ): string {
    const summary = [
      `This era spanned ${years} years, during which ${trajectories.length} souls ` +
        `experienced their personal journeys.`,
      `The population reached ${population} individuals by the end of this period.`,
      `Each soul pursued their purpose, contributing to the collective development ` +
        `of civilization and culture.`,
    ];

    return summary.join(' ');
  }
}
