/**
 * ParadoxDetectionSystem - Detects and resolves temporal paradoxes
 *
 * Priority: 220 (after InvasionPlotHandler 215, before end-of-tick)
 * Throttle: 20 ticks (1 second at 20 TPS - paradox checks are expensive)
 *
 * Responsibilities:
 * - Detect 4 types of paradoxes:
 *   1. Grandfather paradox: killing your own ancestor
 *   2. Bootstrap paradox: information/items with no origin
 *   3. Predestination paradox: preventing event that caused you to prevent it
 *   4. Ontological paradox: entity exists with no origin
 * - Track causal chains via CausalChainComponent
 * - Resolve paradoxes via universe forking, timeline collapse, or retrocausal adjustment
 * - Monitor cross-timeline entity interactions
 *
 * Reference: openspec/specs/grand-strategy/10-MULTIVERSE-MECHANICS.md
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  CausalChainComponent,
  CausalEvent,
  CausalEventType,
} from '../components/CausalChainComponent.js';
import {
  createCausalChainComponent,
  recordParadox,
  resolveParadox,
  markCausalLoop,
} from '../components/CausalChainComponent.js';
import type { DynastyComponent } from '../components/DynastyComponent.js';
import { multiverseCoordinator } from '../multiverse/MultiverseCoordinator.js';

/**
 * Paradox type discriminator
 */
export type ParadoxType = 'grandfather' | 'bootstrap' | 'predestination' | 'ontological';

/**
 * Paradox severity (determines resolution strategy)
 */
export type ParadoxSeverity = 'minor' | 'moderate' | 'severe' | 'catastrophic';

/**
 * Paradox resolution strategy
 */
export type ResolutionStrategy = 'fork' | 'collapse' | 'retrocausal';

/**
 * Detected paradox structure
 */
interface DetectedParadox {
  type: ParadoxType;
  severity: ParadoxSeverity;
  entityId: string;
  description: string;
  causalChain: string[]; // Entity IDs in causal chain
  affectedUniverses: string[];
  tick: number;
}

/**
 * Death record for grandfather paradox detection
 */
interface DeathRecord {
  victimId: string;
  killerId: string;
  tick: number;
  universeId: string;
}

/**
 * ParadoxDetectionSystem
 *
 * Monitors for timeline inconsistencies and resolves them through
 * universe forking, timeline collapse, or retrocausal adjustments.
 */
export class ParadoxDetectionSystem extends BaseSystem {
  public readonly id: SystemId = 'paradox_detection';
  public readonly priority: number = 220; // After InvasionPlotHandler
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  // Lazy activation: Skip system when no causal_chain components exist
  public readonly activationComponents = ['causal_chain'] as const;
  protected readonly throttleInterval = 20; // Every 1 second (20 TPS)

  // Death tracking for grandfather paradox detection
  private deathRecords: Map<string, DeathRecord> = new Map();
  private readonly MAX_DEATH_RECORDS = 10000;

  // Bootstrap paradox tracking (items with no origin)
  private itemOrigins: Map<string, string> = new Map(); // itemId -> creatorId
  private readonly MAX_ITEM_ORIGINS = 5000;

  // Predestination tracking (events that were prevented)
  private preventedEvents: Map<string, {
    eventType: string;
    preventerId: string;
    tick: number;
  }> = new Map();
  private readonly MAX_PREVENTED_EVENTS = 1000;

  // Pending paradoxes to resolve
  private pendingParadoxes: DetectedParadox[] = [];
  private readonly MAX_PENDING_PARADOXES = 100;

  // Cache for family tree lookups
  private ancestorCache: Map<string, Set<string>> = new Map();
  private readonly ANCESTOR_CACHE_SIZE = 1000;
  private ancestorCacheHits = 0;
  private ancestorCacheMisses = 0;

  // Performance constants
  private static readonly MINOR_PARADOX_THRESHOLD = 0.2;
  private static readonly MODERATE_PARADOX_THRESHOLD = 0.5;
  private static readonly SEVERE_PARADOX_THRESHOLD = 0.8;

  protected onInit(ctx: SystemContext): void {
    // Listen for death events to track potential grandfather paradoxes
    ctx.events.onGeneric('agent:died', (data: unknown) => {
      const deathData = data as { entityId: string; killerId?: string; tick?: number };
      if (deathData.killerId && deathData.tick) {
        // Get universe ID from world (with fallback)
        const universeId = 'universeId' in ctx.world ? (ctx.world as unknown as { universeId: string }).universeId : 'unknown';
        this.recordDeath(
          deathData.entityId,
          deathData.killerId,
          deathData.tick,
          universeId
        );
      }
    });

    // Listen for universe forking to track timeline branches
    ctx.events.on('universe:forked', (data) => {
      // When universe forks, we may need to re-check paradoxes
      // in the new timeline
      this.ancestorCache.clear(); // Invalidate cache
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Single-pass paradox detection - check all entities with causal chains
    const causalEntities = ctx.world.query()
      .with(CT.CausalChain)
      .executeEntities();

    // Detect paradoxes
    for (const entity of causalEntities) {
      const causalChain = entity.getComponent<CausalChainComponent>(CT.CausalChain);
      if (!causalChain) continue;

      // Skip if already has unresolved paradoxes (avoid duplicate detection)
      const hasUnresolved = causalChain.paradoxes.some(p => !p.resolved);
      if (hasUnresolved) continue;

      // Check for each paradox type
      this.detectGrandfatherParadox(entity, causalChain, tick, ctx);
      this.detectBootstrapParadox(entity, causalChain, tick, ctx);
      this.detectPredestinationParadox(entity, causalChain, tick, ctx);
      this.detectOntologicalParadox(entity, causalChain, tick, ctx);
    }

    // Resolve pending paradoxes
    this.resolvePendingParadoxes(ctx);

    // Prune old records to prevent memory leaks
    if (tick % 1000 === 0) { // Every 50 seconds
      this.pruneOldRecords(tick);
    }
  }

  // ============================================================================
  // Grandfather Paradox Detection
  // ============================================================================

  /**
   * Detect grandfather paradox: agent kills their own ancestor
   *
   * Algorithm:
   * 1. Check if entity has killed anyone (via deathRecords)
   * 2. For each kill, check if victim is in entity's causal chain
   * 3. If so, entity killed their own ancestor -> paradox
   */
  private detectGrandfatherParadox(
    entity: Entity,
    causalChain: CausalChainComponent,
    tick: number,
    ctx: SystemContext
  ): void {
    // Early exit: entity hasn't killed anyone
    const killsBy = this.getKillsByEntity(entity.id);
    if (killsBy.length === 0) return;

    // Get entity's ancestors (all causal parents recursively)
    const ancestors = this.getAncestors(entity.id, ctx.world);

    // Check if any kills are ancestors
    for (const death of killsBy) {
      if (ancestors.has(death.victimId)) {
        // PARADOX DETECTED: killed own ancestor
        const victim = ctx.world.getEntity(death.victimId);
        const agentComp = victim?.getComponent(CT.Agent);
        const victimName = (agentComp && typeof agentComp === 'object' && 'name' in agentComp)
          ? agentComp.name || 'Unknown'
          : 'Unknown';

        const paradox: DetectedParadox = {
          type: 'grandfather',
          severity: this.calculateGrandfatherSeverity(death.victimId, entity.id, ctx.world),
          entityId: entity.id,
          description: `Entity ${entity.id} killed ancestor ${victimName} (${death.victimId})`,
          causalChain: [entity.id, death.victimId],
          affectedUniverses: [death.universeId],
          tick,
        };

        this.pendingParadoxes.push(paradox);

        // Record on entity
        const updated = recordParadox(
          causalChain,
          'grandfather',
          paradox.description,
          tick
        );

        (entity as unknown as EntityImpl).updateComponent(CT.CausalChain, () => updated);

        // Emit event
        ctx.emit('multiverse:paradox_detected', {
          entityId: entity.id,
          paradoxType: 'grandfather',
          severity: paradox.severity,
          description: paradox.description,
          causalChain: paradox.causalChain,
          tick,
        }, entity.id);
      }
    }
  }

  /**
   * Calculate grandfather paradox severity based on ancestor distance
   */
  private calculateGrandfatherSeverity(
    ancestorId: string,
    descendantId: string,
    world: World
  ): ParadoxSeverity {
    // Get dynasty components to measure lineage distance
    const descendant = world.getEntity(descendantId);
    const dynasty = descendant?.getComponent<DynastyComponent>(CT.Dynasty);

    if (!dynasty) {
      return 'moderate'; // Unknown lineage, assume moderate
    }

    // Direct parent = catastrophic, grandparent = severe, etc.
    if (dynasty.parentId === ancestorId) {
      return 'catastrophic'; // Killed own parent
    }

    const distance = this.getLineageDistance(ancestorId, descendantId, world);
    if (distance <= 2) return 'severe';      // Parent or grandparent
    if (distance <= 5) return 'moderate';    // Great-grandparent or closer
    return 'minor';                          // Distant ancestor
  }

  // ============================================================================
  // Bootstrap Paradox Detection
  // ============================================================================

  /**
   * Detect bootstrap paradox: information/items loop with no origin
   *
   * Algorithm:
   * 1. Check if entity has time-traveled
   * 2. Check if entity was created by its future self
   * 3. Check if entity's causal chain forms a loop
   */
  private detectBootstrapParadox(
    entity: Entity,
    causalChain: CausalChainComponent,
    tick: number,
    ctx: SystemContext
  ): void {
    // Early exit: no time travel = no bootstrap paradox
    if (!causalChain.hasTimeTraveled) return;

    // Check for causal loops
    const hasLoop = this.detectCausalLoop(causalChain);
    if (!hasLoop) return;

    // Check if entity has no verifiable origin
    const hasOrigin = this.verifyOrigin(causalChain, ctx.world);
    if (hasOrigin) return;

    // PARADOX DETECTED: bootstrap paradox
    const paradox: DetectedParadox = {
      type: 'bootstrap',
      severity: 'moderate', // Bootstrap paradoxes are usually moderate
      entityId: entity.id,
      description: `Entity ${entity.id} exists in causal loop with no origin`,
      causalChain: [entity.id, ...causalChain.causalParents],
      affectedUniverses: causalChain.universesVisited,
      tick,
    };

    this.pendingParadoxes.push(paradox);

    // Record on entity
    const updated = recordParadox(
      causalChain,
      'bootstrap',
      paradox.description,
      tick
    );

    (entity as unknown as EntityImpl).updateComponent(CT.CausalChain, () => updated);

    // Mark as in causal loop
    const loopMarked = markCausalLoop(updated, tick);
    (entity as unknown as EntityImpl).updateComponent(CT.CausalChain, () => loopMarked);

    // Emit event
    ctx.emit('multiverse:paradox_detected', {
      entityId: entity.id,
      paradoxType: 'bootstrap',
      severity: paradox.severity,
      description: paradox.description,
      causalChain: paradox.causalChain,
      tick,
    }, entity.id);
  }

  /**
   * Detect causal loop in entity's history
   */
  private detectCausalLoop(causalChain: CausalChainComponent): boolean {
    // Check if entity appears in its own causal history
    const seenEntities = new Set<string>();

    for (const event of causalChain.causalHistory) {
      for (const agent of event.causalAgents) {
        if (seenEntities.has(agent)) {
          return true; // Loop detected
        }
        seenEntities.add(agent);
      }
    }

    return false;
  }

  /**
   * Verify entity has a legitimate origin
   */
  private verifyOrigin(causalChain: CausalChainComponent, world: World): boolean {
    // Check if creation type is valid
    const validCreationTypes: CausalEventType[] = [
      'birth',
      'creation',
      'divine',
      'emerged',
      'manufactured',
    ];

    if (validCreationTypes.includes(causalChain.creationType)) {
      return true; // Has valid origin
    }

    // Check if causal parents exist and are valid
    for (const parentId of causalChain.causalParents) {
      const parent = world.getEntity(parentId);
      if (parent) {
        return true; // At least one parent exists
      }
    }

    return false; // No verifiable origin
  }

  // ============================================================================
  // Predestination Paradox Detection
  // ============================================================================

  /**
   * Detect predestination paradox: preventing event that caused prevention
   *
   * Algorithm:
   * 1. Check if entity has prevented any events
   * 2. Check if prevention action was caused by the event itself
   * 3. If so, self-fulfilling prophecy -> paradox
   */
  private detectPredestinationParadox(
    entity: Entity,
    causalChain: CausalChainComponent,
    tick: number,
    ctx: SystemContext
  ): void {
    // Check if entity has self-caused existence flag
    if (!causalChain.selfCausedExistence) return;

    // Check causal history for predestination pattern
    const hasPredestination = this.detectPredestinationPattern(causalChain);
    if (!hasPredestination) return;

    // PARADOX DETECTED: predestination paradox
    const paradox: DetectedParadox = {
      type: 'predestination',
      severity: 'moderate',
      entityId: entity.id,
      description: `Entity ${entity.id} prevented event that caused its prevention`,
      causalChain: [entity.id],
      affectedUniverses: causalChain.universesVisited,
      tick,
    };

    this.pendingParadoxes.push(paradox);

    // Record on entity
    const updated = recordParadox(
      causalChain,
      'predestination',
      paradox.description,
      tick
    );

    (entity as unknown as EntityImpl).updateComponent(CT.CausalChain, () => updated);

    // Emit event
    ctx.emit('multiverse:paradox_detected', {
      entityId: entity.id,
      paradoxType: 'predestination',
      severity: paradox.severity,
      description: paradox.description,
      causalChain: paradox.causalChain,
      tick,
    }, entity.id);
  }

  /**
   * Detect predestination pattern in causal history
   */
  private detectPredestinationPattern(causalChain: CausalChainComponent): boolean {
    // Look for time_travel event followed by creation event with same timestamp
    for (let i = 0; i < causalChain.causalHistory.length - 1; i++) {
      const event1 = causalChain.causalHistory[i];
      const event2 = causalChain.causalHistory[i + 1];

      if (
        event1 &&
        event2 &&
        event1.eventType === 'time_travel' &&
        event2.eventType === 'creation' &&
        event1.timestamp === event2.timestamp
      ) {
        return true; // Predestination pattern detected
      }
    }

    return false;
  }

  // ============================================================================
  // Ontological Paradox Detection
  // ============================================================================

  /**
   * Detect ontological paradox: entity exists with no origin
   *
   * Algorithm:
   * 1. Check if entity has time-traveled
   * 2. Check if entity has no creation event in original universe
   * 3. Check if all causal parents are also from future
   */
  private detectOntologicalParadox(
    entity: Entity,
    causalChain: CausalChainComponent,
    tick: number,
    ctx: SystemContext
  ): void {
    // Early exit: already flagged as no origin
    if (causalChain.hasNoOrigin) {
      // Already detected, check if we should escalate
      return;
    }

    // Check if entity appeared via time travel without origin
    const appearedViaTimeTravel = causalChain.hasTimeTraveled &&
                                  causalChain.creationType === 'time_travel';

    if (!appearedViaTimeTravel) return;

    // Check if entity exists in origin universe
    const originUniverse = multiverseCoordinator.getUniverse(causalChain.originUniverseId);
    if (!originUniverse) {
      // Origin universe doesn't exist anymore - ontological paradox
      const paradox: DetectedParadox = {
        type: 'ontological',
        severity: 'severe',
        entityId: entity.id,
        description: `Entity ${entity.id} exists but origin universe ${causalChain.originUniverseId} no longer exists`,
        causalChain: [entity.id],
        affectedUniverses: causalChain.universesVisited,
        tick,
      };

      this.pendingParadoxes.push(paradox);

      // Record on entity
      const updated = recordParadox(
        causalChain,
        'ontological',
        paradox.description,
        tick
      );

      (entity as unknown as EntityImpl).updateComponent(CT.CausalChain, () => ({
        ...updated,
        hasNoOrigin: true,
      }));

      // Emit event
      ctx.emit('multiverse:paradox_detected', {
        entityId: entity.id,
        paradoxType: 'ontological',
        severity: paradox.severity,
        description: paradox.description,
        causalChain: paradox.causalChain,
        tick,
      }, entity.id);
    }
  }

  // ============================================================================
  // Paradox Resolution
  // ============================================================================

  /**
   * Resolve pending paradoxes
   */
  private resolvePendingParadoxes(ctx: SystemContext): void {
    // Process up to 5 paradoxes per tick to avoid lag spikes
    const batchSize = Math.min(5, this.pendingParadoxes.length);

    for (let i = 0; i < batchSize; i++) {
      const paradox = this.pendingParadoxes.shift();
      if (!paradox) break;

      // Choose resolution strategy based on severity
      const strategy = this.chooseResolutionStrategy(paradox);

      // Execute resolution
      this.executeResolution(paradox, strategy, ctx);
    }
  }

  /**
   * Choose resolution strategy based on paradox severity
   */
  private chooseResolutionStrategy(paradox: DetectedParadox): ResolutionStrategy {
    switch (paradox.severity) {
      case 'catastrophic':
      case 'severe':
        return 'fork'; // Severe paradoxes require universe forking

      case 'moderate':
        // Moderate paradoxes can collapse timelines if they're related
        return Math.random() < 0.5 ? 'fork' : 'collapse';

      case 'minor':
        return 'retrocausal'; // Minor paradoxes auto-resolve via quantum effects

      default:
        return 'fork';
    }
  }

  /**
   * Execute paradox resolution
   */
  private executeResolution(
    paradox: DetectedParadox,
    strategy: ResolutionStrategy,
    ctx: SystemContext
  ): void {
    switch (strategy) {
      case 'fork':
        this.resolveThroughForking(paradox, ctx);
        break;

      case 'collapse':
        this.resolveThroughCollapse(paradox, ctx);
        break;

      case 'retrocausal':
        this.resolveThroughRetrocausal(paradox, ctx);
        break;
    }

    // Mark paradox as resolved on entity
    const entity = ctx.world.getEntity(paradox.entityId);
    if (entity) {
      const causalChain = entity.getComponent<CausalChainComponent>(CT.CausalChain);
      if (causalChain) {
        const paradoxIndex = causalChain.paradoxes.findIndex(
          p => !p.resolved && p.type === paradox.type
        );

        if (paradoxIndex !== -1) {
          const resolved = resolveParadox(causalChain, paradoxIndex, strategy, ctx.tick);
          (entity as unknown as EntityImpl).updateComponent(CT.CausalChain, () => resolved);
        }
      }
    }
  }

  /**
   * Resolve through universe forking
   */
  private resolveThroughForking(paradox: DetectedParadox, ctx: SystemContext): void {
    // Emit fork request event
    ctx.emit('multiverse:paradox_forked', {
      paradoxType: paradox.type,
      severity: paradox.severity,
      entityId: paradox.entityId,
      description: paradox.description,
      tick: paradox.tick,
    }, paradox.entityId);

    // Request universe fork via UniverseForkingSystem
    ctx.emit('universe:fork_requested', {
      forkAtTick: paradox.tick,
      reason: `Paradox resolution: ${paradox.type} (${paradox.severity})`,
    });
  }

  /**
   * Resolve through timeline collapse
   */
  private resolveThroughCollapse(paradox: DetectedParadox, ctx: SystemContext): void {
    // Emit collapse event
    ctx.emit('multiverse:timeline_collapsed', {
      paradoxType: paradox.type,
      severity: paradox.severity,
      entityId: paradox.entityId,
      description: paradox.description,
      affectedUniverses: paradox.affectedUniverses,
      tick: paradox.tick,
    }, paradox.entityId);

    // TODO: Implement timeline collapse logic
    // For now, just emit event - actual collapse handled by TimelineManager
  }

  /**
   * Resolve through retrocausal adjustment
   */
  private resolveThroughRetrocausal(paradox: DetectedParadox, ctx: SystemContext): void {
    // Emit retrocausal adjustment event
    ctx.emit('multiverse:retrocausal_adjustment', {
      paradoxType: paradox.type,
      severity: paradox.severity,
      entityId: paradox.entityId,
      description: `Minor paradox auto-corrected via quantum effects`,
      adjustmentType: 'quantum_decoherence',
      tick: paradox.tick,
    }, paradox.entityId);

    // Minor adjustment - no major universe changes needed
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Record a death for grandfather paradox detection
   */
  private recordDeath(
    victimId: string,
    killerId: string,
    tick: number,
    universeId: string
  ): void {
    const key = `${victimId}:${killerId}`;
    this.deathRecords.set(key, {
      victimId,
      killerId,
      tick,
      universeId,
    });

    // Prune if too many records
    if (this.deathRecords.size > this.MAX_DEATH_RECORDS) {
      const keysToDelete = Array.from(this.deathRecords.keys()).slice(0, 1000);
      for (const k of keysToDelete) {
        this.deathRecords.delete(k);
      }
    }
  }

  /**
   * Get all kills by an entity
   */
  private getKillsByEntity(entityId: string): DeathRecord[] {
    const kills: DeathRecord[] = [];
    for (const [_key, record] of this.deathRecords) {
      if (record.killerId === entityId) {
        kills.push(record);
      }
    }
    return kills;
  }

  /**
   * Get all ancestors of an entity (cached)
   */
  private getAncestors(entityId: string, world: World): Set<string> {
    // Check cache
    const cached = this.ancestorCache.get(entityId);
    if (cached) {
      this.ancestorCacheHits++;
      return cached;
    }

    this.ancestorCacheMisses++;

    // Compute ancestors recursively
    const ancestors = new Set<string>();
    const visited = new Set<string>();
    const queue: string[] = [entityId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) continue;
      visited.add(current);

      const entity = world.getEntity(current);
      if (!entity) continue;

      // Get causal parents
      const causalChain = entity.getComponent<CausalChainComponent>(CT.CausalChain);
      if (causalChain) {
        for (const parentId of causalChain.causalParents) {
          ancestors.add(parentId);
          queue.push(parentId);
        }
      }

      // Get dynasty parents
      const dynasty = entity.getComponent<DynastyComponent>(CT.Dynasty);
      if (dynasty && dynasty.parentId) {
        ancestors.add(dynasty.parentId);
        queue.push(dynasty.parentId);
      }
    }

    // Cache result
    this.ancestorCache.set(entityId, ancestors);

    // Prune cache if too large
    if (this.ancestorCache.size > this.ANCESTOR_CACHE_SIZE) {
      const keysToDelete = Array.from(this.ancestorCache.keys()).slice(0, 100);
      for (const k of keysToDelete) {
        this.ancestorCache.delete(k);
      }
    }

    return ancestors;
  }

  /**
   * Get lineage distance between ancestor and descendant
   */
  private getLineageDistance(ancestorId: string, descendantId: string, world: World): number {
    let distance = 0;
    let currentId = descendantId;
    const visited = new Set<string>();

    while (currentId && distance < 20) { // Max depth 20 to prevent infinite loops
      if (currentId === ancestorId) return distance;
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const entity = world.getEntity(currentId);
      if (!entity) break;

      const dynasty = entity.getComponent<DynastyComponent>(CT.Dynasty);
      if (!dynasty || !dynasty.parentId) break;

      currentId = dynasty.parentId;
      distance++;
    }

    return distance;
  }

  /**
   * Prune old records to prevent memory leaks
   */
  private pruneOldRecords(currentTick: number): void {
    // Prune death records older than 10000 ticks (500 seconds)
    const cutoffTick = currentTick - 10000;

    for (const [key, record] of this.deathRecords) {
      if (record.tick < cutoffTick) {
        this.deathRecords.delete(key);
      }
    }

    // Prune prevented events older than 5000 ticks
    for (const [key, event] of this.preventedEvents) {
      if (event.tick < cutoffTick) {
        this.preventedEvents.delete(key);
      }
    }

    // Clear ancestor cache every 1000 ticks to prevent stale data
    if (currentTick % 1000 === 0) {
      this.ancestorCache.clear();
    }
  }

  /**
   * Get universe ID for a world from multiverse coordinator
   */
  private getUniverseIdForWorld(world: World): string {
    // Find universe ID by checking all registered universes
    for (const [id, instance] of multiverseCoordinator.getAllUniverses()) {
      if (instance.world === world) {
        return id;
      }
    }
    return 'unknown';
  }
}
