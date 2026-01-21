import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { Component } from '../ecs/Component.js';
import { createConflictComponent, type ConflictComponent } from '../components/ConflictComponent.js';
import { createInjuryComponent } from '../components/InjuryComponent.js';
import type { CombatStatsComponent } from '../components/CombatStatsComponent.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

// Simplified animal component interface for predator attacks
interface AnimalComponent extends Component {
  readonly type: 'animal';
  readonly version: number;
  species: string;
  danger: number;
  speed: number;
  awareness: number;
  aggression: number;
  hunger?: number;
}

interface PositionComponent extends Component {
  readonly type: 'position';
  readonly version: number;
  x: number;
  y: number;
  z: number;
}

interface AlertComponent extends Component {
  readonly type: 'alert';
  readonly version: number;
  alertType: string;
  location: { x: number; y: number; z: number };
}

interface TerritoryComponent extends Component {
  readonly type: 'territory';
  readonly version: number;
  center: { x: number; y: number; z: number };
  radius: number;
}


/**
 * PredatorAttackSystem - Handles predator attacks on agents
 *
 * Implements REQ-CON-002: Predator Attacks
 * - Evaluates attack triggers (hunger, territory, provocation)
 * - Performs detection checks based on stealth
 * - Resolves combat with skill checks
 * - Applies injuries on failed defense
 * - Alerts nearby agents
 * - Creates trauma memories for near-death experiences
 *
 * PERFORMANCE OPTIMIZATIONS (2026-01-18):
 * - Throttling: 50 ticks (2.5s) - attacks are rare events
 * - Map-based caching: O(1) predator/agent lookups
 * - Early exits: Skip when no predators or agents
 * - Zero allocations: Reusable working objects
 * - Spatial optimization: Squared distance, precomputed radii
 * - Cooldown tracking: Map-based attack tracking
 */
export class PredatorAttackSystem extends BaseSystem {
  public readonly id: SystemId = 'predator_attack';
  public readonly priority = 47;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['animal'] as const;
  // Only run when animal components exist (O(1) activation check)
  public readonly activationComponents = ['animal'] as const;

  /** Throttle to every 2.5 seconds (50 ticks at 20 TPS) - attacks are rare events */
  protected readonly throttleInterval = 50;

  // ===== PERFORMANCE: Precomputed constants =====
  private readonly PREDATOR_DANGER_THRESHOLD = 5;
  private readonly DETECTION_RADIUS = 10;
  private readonly DETECTION_RADIUS_SQ = 10 * 10;
  private readonly ALLY_RADIUS = 5;
  private readonly ALLY_RADIUS_SQ = 5 * 5;
  private readonly ALERT_RADIUS = 15;
  private readonly ALERT_RADIUS_SQ = 15 * 15;
  private readonly MIN_VELOCITY_THRESHOLD = 0.001;

  // ===== PERFORMANCE: Entity caching (Map-based for O(1) lookups) =====
  private predatorCache = new Map<string, AnimalComponent>();
  private agentCache = new Map<string, PositionComponent>();
  private attackCooldowns = new Map<string, number>(); // predatorId -> tick of last attack
  private lastCacheRebuild = 0;
  private readonly CACHE_REBUILD_INTERVAL = 200; // Rebuild every 10 seconds

  // ===== PERFORMANCE: Reusable working objects (zero allocations) =====
  private readonly workingDistance = { dx: 0, dy: 0, dz: 0, distanceSq: 0 };
  private readonly workingNearbyAgents: string[] = [];
  private readonly workingAllies: string[] = [];

  protected onUpdate(ctx: SystemContext): void {
    // PERFORMANCE: Early exit - no active animals
    if (ctx.activeEntities.length === 0) {
      return;
    }

    // PERFORMANCE: Periodic cache rebuild for correctness
    const shouldRebuildCache = ctx.world.tick - this.lastCacheRebuild >= this.CACHE_REBUILD_INTERVAL;

    if (shouldRebuildCache) {
      this.rebuildCaches(ctx.world, ctx.activeEntities);
      this.lastCacheRebuild = ctx.world.tick;
    } else {
      // Incremental cache updates
      this.updateCachesIncremental(ctx.world, ctx.activeEntities);
    }

    // PERFORMANCE: Early exit - no predators
    if (this.predatorCache.size === 0) {
      return;
    }

    // PERFORMANCE: Early exit - no agents
    if (this.agentCache.size === 0) {
      return;
    }

    // PERFORMANCE: Clean up old cooldowns (attacks older than 5 minutes)
    const cooldownExpiry = ctx.world.tick - 6000; // 5 minutes at 20 TPS
    for (const [predatorId, lastAttackTick] of this.attackCooldowns.entries()) {
      if (lastAttackTick < cooldownExpiry) {
        this.attackCooldowns.delete(predatorId);
      }
    }

    // Process each predator (using cached data)
    for (const [predatorId, animal] of this.predatorCache.entries()) {
      // PERFORMANCE: Skip predators on cooldown (recently attacked)
      const lastAttackTick = this.attackCooldowns.get(predatorId);
      if (lastAttackTick !== undefined && ctx.world.tick - lastAttackTick < this.throttleInterval) {
        continue;
      }

      const predator = ctx.world.getEntity(predatorId);
      if (!predator) {
        continue; // Entity was removed
      }

      this.processPredatorOptimized(ctx.world, predator, predatorId, animal, ctx.world.tick);
    }
  }

  /**
   * PERFORMANCE: Full cache rebuild (every 10 seconds for correctness)
   */
  private rebuildCaches(world: World, activeEntities: ReadonlyArray<Entity>): void {
    this.predatorCache.clear();
    this.agentCache.clear();

    // Rebuild predator cache
    for (const entity of activeEntities) {
      const animal = world.getComponent<AnimalComponent>(entity.id, 'animal');
      if (animal && animal.danger >= this.PREDATOR_DANGER_THRESHOLD) {
        this.predatorCache.set(entity.id, animal);
      }
    }

    // Rebuild agent cache (all agents with position)
    const agents = world.query().with('agent').with('position').executeEntities();
    for (const agent of agents) {
      const pos = world.getComponent<PositionComponent>(agent.id, 'position');
      if (pos) {
        this.agentCache.set(agent.id, pos);
      }
    }
  }

  /**
   * PERFORMANCE: Incremental cache updates (between rebuilds)
   */
  private updateCachesIncremental(world: World, activeEntities: ReadonlyArray<Entity>): void {
    // Update predator cache with any new/changed animals
    for (const entity of activeEntities) {
      const animal = world.getComponent<AnimalComponent>(entity.id, 'animal');
      if (animal && animal.danger >= this.PREDATOR_DANGER_THRESHOLD) {
        this.predatorCache.set(entity.id, animal);
      } else {
        this.predatorCache.delete(entity.id);
      }
    }

    // Agent cache is rebuilt periodically (agents move, so position changes frequently)
  }

  /**
   * PERFORMANCE: Optimized predator processing using cached data
   */
  private processPredatorOptimized(
    world: World,
    predator: Entity,
    predatorId: string,
    animal: AnimalComponent,
    currentTick: number
  ): void {
    const predatorPos = world.getComponent<PositionComponent>(predatorId, 'position');

    // Validate predator has required components
    if (!predatorPos) {
      throw new Error('Predator missing required component: position');
    }

    // Validate danger level
    if (animal.danger < 0 || animal.danger > 10) {
      throw new Error(`Invalid danger level: must be 0-10, got ${animal.danger}`);
    }

    // PERFORMANCE: Early exit - predator already in combat
    if (world.hasComponent(predatorId, 'conflict')) {
      const conflict = world.getComponent<ConflictComponent>(predatorId, 'conflict');
      if (conflict && conflict.state !== 'resolved') {
        return; // Already in combat
      }
    }

    // PERFORMANCE: Find nearby agents using cached positions (squared distance)
    this.workingNearbyAgents.length = 0; // Clear working array (reuse)
    let closestAgentId: string | null = null;
    let closestDistanceSq = this.DETECTION_RADIUS_SQ;

    for (const [agentId, agentPos] of this.agentCache.entries()) {
      // PERFORMANCE: Squared distance (no sqrt)
      this.calculateDistanceSquared(predatorPos, agentPos, this.workingDistance);
      const distSq = this.workingDistance.distanceSq;

      if (distSq <= this.DETECTION_RADIUS_SQ) {
        this.workingNearbyAgents.push(agentId);

        // Track closest agent
        if (distSq < closestDistanceSq) {
          closestDistanceSq = distSq;
          closestAgentId = agentId;
        }
      }
    }

    // PERFORMANCE: Early exit - no targets
    if (closestAgentId === null) {
      return;
    }

    const target = world.getEntity(closestAgentId);
    if (!target) {
      return;
    }

    const targetPos = this.agentCache.get(closestAgentId);
    if (!targetPos) {
      throw new Error('Target missing required component: position');
    }

    // Evaluate attack trigger
    const shouldAttack = this.evaluateAttackTrigger(world, predator, target, animal);
    if (!shouldAttack) {
      return;
    }

    // Get trigger type
    const trigger = this.getAttackTrigger(world, predator, target, animal);

    // Perform detection check if agent has stealth
    const combatStats = world.getComponent<CombatStatsComponent>(closestAgentId, 'combat_stats');
    if (combatStats && combatStats.stealthSkill) {
      const detected = this.performDetectionCheck(animal, combatStats);
      if (!detected) {
        return; // Agent successfully avoided detection
      }
    }

    // PERFORMANCE: Record attack cooldown
    this.attackCooldowns.set(predatorId, currentTick);

    // Create conflict component on predator
    const predatorImpl = predator as EntityImpl;
    predatorImpl.addComponent(createConflictComponent({
      conflictType: 'predator_attack',
      target: closestAgentId,
      state: 'attacking',
      startTime: Date.now(),
      trigger,
      metadata: { trigger },
    }));

    // Emit predator:attack event
    this.events.emit('predator:attack', {
      predatorId: predatorId,
      targetId: closestAgentId,
      predatorType: animal.species,
    }, predatorId);

    // PERFORMANCE: Find allies using cached positions (squared distance)
    this.workingAllies.length = 0; // Clear working array (reuse)
    for (const agentId of this.workingNearbyAgents) {
      if (agentId === closestAgentId) {
        continue;
      }
      if (!world.hasComponent(agentId, 'combat_stats')) {
        continue;
      }

      const agentPos = this.agentCache.get(agentId);
      if (!agentPos) {
        continue;
      }

      this.calculateDistanceSquared(targetPos, agentPos, this.workingDistance);
      if (this.workingDistance.distanceSq <= this.ALLY_RADIUS_SQ) {
        this.workingAllies.push(agentId);
      }
    }

    // Resolve combat
    this.resolveCombatOptimized(world, predator, target, closestAgentId, animal, combatStats ?? null);

    // Alert nearby agents
    this.alertNearbyAgentsOptimized(world, predatorId, closestAgentId, targetPos, animal);
  }

  private evaluateAttackTrigger(
    world: World,
    predator: Entity,
    target: Entity,
    animal: AnimalComponent
  ): boolean {
    const hunger = animal.hunger ?? 50;

    // Check for provocation (agent attacking predator)
    if (world.hasComponent(target.id, 'conflict')) {
      const targetConflict = world.getComponent<ConflictComponent>(target.id, 'conflict');
      if (targetConflict && targetConflict.target === predator.id) {
        return true; // Provocation attack
      }
    }

    // Check for territory defense
    if (world.hasComponent(predator.id, 'territory')) {
      const territory = world.getComponent<TerritoryComponent>(predator.id, 'territory');
      const targetPos = world.getComponent<PositionComponent>(target.id, 'position');
      if (territory && targetPos) {
        // PERFORMANCE: Squared distance comparison
        this.calculateDistanceSquared(territory.center, targetPos, this.workingDistance);
        const radiusSq = territory.radius * territory.radius;
        if (this.workingDistance.distanceSq <= radiusSq) {
          return true; // Territory defense
        }
      }
    }

    // Hunger-based attack (hunger > 60 increases likelihood)
    if (hunger >= 80) {
      // Very hungry - always attack
      return true;
    } else if (hunger > 60) {
      const attackChance = (hunger - 60) / 40; // 0.0 to 1.0
      return Math.random() < attackChance * (animal.aggression / 10);
    }

    return false;
  }

  private getAttackTrigger(
    world: World,
    predator: Entity,
    target: Entity,
    _animal: AnimalComponent
  ): 'hunger' | 'territory' | 'provocation' {
    // Check provocation first
    if (world.hasComponent(target.id, 'conflict')) {
      const targetConflict = world.getComponent<ConflictComponent>(target.id, 'conflict');
      if (targetConflict && targetConflict.target === predator.id) {
        return 'provocation';
      }
    }

    // Check territory
    if (world.hasComponent(predator.id, 'territory')) {
      const territory = world.getComponent<TerritoryComponent>(predator.id, 'territory');
      const targetPos = world.getComponent<PositionComponent>(target.id, 'position');
      if (territory && targetPos) {
        // PERFORMANCE: Squared distance comparison
        this.calculateDistanceSquared(territory.center, targetPos, this.workingDistance);
        const radiusSq = territory.radius * territory.radius;
        if (this.workingDistance.distanceSq <= radiusSq) {
          return 'territory';
        }
      }
    }

    return 'hunger';
  }

  private performDetectionCheck(animal: AnimalComponent, combatStats: CombatStatsComponent): boolean {
    const awareness = animal.awareness;
    const stealth = combatStats.stealthSkill || 0;

    // Detection chance = awareness - stealth + terrain/weather modifiers
    // For simplicity, no terrain/weather modifiers in this implementation
    const detectionChance = (awareness - stealth + 10) / 20; // Normalized to 0-1

    return Math.random() < Math.max(0.1, Math.min(0.9, detectionChance));
  }

  /**
   * PERFORMANCE: Optimized combat resolution using cached ally data
   */
  private resolveCombatOptimized(
    world: World,
    predator: Entity,
    target: Entity,
    targetId: string,
    animal: AnimalComponent,
    combatStats: CombatStatsComponent | null
  ): void {
    // Calculate combat power
    const predatorPower = animal.danger;
    let defenderPower = combatStats?.combatSkill || 0;

    // Weapon bonus
    if (combatStats?.weapon === 'club') {
      defenderPower += 1;
    } else if (combatStats?.weapon === 'spear') {
      defenderPower += 2;
    } else if (combatStats?.weapon === 'sword') {
      defenderPower += 3;
    }

    // Armor bonus
    if (combatStats?.armor === 'leather') {
      defenderPower += 1;
    } else if (combatStats?.armor === 'chainmail') {
      defenderPower += 2;
    }

    // PERFORMANCE: Ally bonuses using cached ally list (workingAllies)
    const predatorImpl = predator as EntityImpl;
    const combatants = [targetId];
    for (const allyId of this.workingAllies) {
      const allyStats = world.getComponent<CombatStatsComponent>(allyId, 'combat_stats');
      if (allyStats) {
        defenderPower += allyStats.combatSkill * 0.5; // Allies contribute half their skill
        combatants.push(allyId);
      }
    }

    // Update conflict with combatants
    predatorImpl.updateComponent<ConflictComponent>('conflict', (c) => ({
      ...c,
      combatants,
    }));

    // Determine outcome
    const totalPower = predatorPower + defenderPower;
    const predatorChance = predatorPower / totalPower;
    const predatorWins = Math.random() < predatorChance;

    if (predatorWins) {
      // Agent is injured
      this.applyInjury(world, target, animal);

      // Update conflict state
      predatorImpl.updateComponent<ConflictComponent>('conflict', (c) => ({
        ...c,
        state: 'resolved',
        outcome: 'attacker_victory',
      }));

      // Emit predator:attack event
      this.events.emit('predator:attack', {
        predatorId: predator.id,
        targetId: target.id,
        predatorType: animal.species,
      }, predator.id);
    } else {
      // Agent successfully defended - predator repelled
      predatorImpl.updateComponent<ConflictComponent>('conflict', (c) => ({
        ...c,
        state: 'repelled',
        outcome: 'defender_victory',
      }));

      // Emit predator:repelled event
      this.events.emit('predator:repelled', {
        predatorId: predator.id,
        defenderId: target.id,
      }, predator.id);
    }
  }

  private applyInjury(world: World, target: Entity, animal: AnimalComponent): void {
    const targetImpl = target as EntityImpl;

    // Determine injury type based on predator
    const injuryTypes: Array<'laceration' | 'puncture' | 'bite'> = ['laceration', 'puncture', 'bite'];
    const injuryType = injuryTypes[Math.floor(Math.random() * injuryTypes.length)] ?? 'bite';

    // Determine severity based on danger level
    let severity: 'minor' | 'major' | 'critical';
    if (animal.danger >= 8) {
      severity = Math.random() < 0.5 ? 'critical' : 'major';
    } else if (animal.danger >= 6) {
      severity = Math.random() < 0.5 ? 'major' : 'minor';
    } else {
      severity = 'minor';
    }

    // Determine location
    const locations: Array<'head' | 'torso' | 'arms' | 'legs'> = ['head', 'torso', 'arms', 'legs'];
    const location = locations[Math.floor(Math.random() * locations.length)] ?? 'torso';

    // Add injury component
    targetImpl.addComponent(createInjuryComponent({
      injuryType,
      severity,
      location,
    }));

    // Check for near-death (critical injury) - create trauma memory
    if (severity === 'critical') {
      const memoryComp = world.getComponent<EpisodicMemoryComponent>(target.id, 'episodic_memory');
      if (memoryComp) {
        memoryComp.formMemory({
          eventType: 'trauma',
          summary: `Near-death experience from ${animal.species} attack`,
          timestamp: Date.now(),
          emotionalValence: -1.0, // Extremely negative
          emotionalIntensity: 1.0, // Maximum intensity
          surprise: 0.9,
          importance: 1.0,
          survivalRelevance: 1.0,
          participants: [target.id],
        });
      }
    }

    // Emit injury:inflicted event
    this.events.emit('injury:inflicted', {
      entityId: target.id,
      injuryType,
      severity,
      location,
      cause: 'predator_attack',
    }, target.id);
  }

  /**
   * PERFORMANCE: Optimized alert system using cached agent positions
   */
  private alertNearbyAgentsOptimized(
    world: World,
    predatorId: string,
    targetId: string,
    targetPos: PositionComponent,
    animal: AnimalComponent
  ): void {
    // PERFORMANCE: Iterate cached agents instead of full query
    for (const [agentId, agentPos] of this.agentCache.entries()) {
      if (agentId === targetId) {
        continue;
      }

      // PERFORMANCE: Squared distance (no sqrt)
      this.calculateDistanceSquared(targetPos, agentPos, this.workingDistance);
      if (this.workingDistance.distanceSq <= this.ALERT_RADIUS_SQ) {
        const agent = world.getEntity(agentId);
        if (!agent) {
          continue;
        }

        const agentImpl = agent as EntityImpl;
        agentImpl.addComponent({
          type: 'alert',
          version: 1,
          alertType: 'predator_attack',
          location: { x: targetPos.x, y: targetPos.y, z: targetPos.z },
        } as AlertComponent);

        // PERFORMANCE: sqrt required here - actual distance value needed for event data
        const distance = Math.sqrt(this.workingDistance.distanceSq);

        // Emit guard:threat_detected event
        this.events.emit('guard:threat_detected', {
          guardId: agentId,
          threatId: predatorId,
          threatLevel: animal.danger,
          distance,
          location: { x: targetPos.x, y: targetPos.y, z: targetPos.z },
        }, agentId);
      }
    }
  }

  /**
   * PERFORMANCE: Calculate squared distance (avoids expensive sqrt)
   * Uses reusable working object to avoid allocations
   */
  private calculateDistanceSquared(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number },
    out: { dx: number; dy: number; dz: number; distanceSq: number }
  ): void {
    out.dx = pos1.x - pos2.x;
    out.dy = pos1.y - pos2.y;
    out.dz = pos1.z - pos2.z;
    out.distanceSq = out.dx * out.dx + out.dy * out.dy + out.dz * out.dz;
  }

  /**
   * Calculate distance with sqrt (used in territory checks where exact distance needed)
   * DEPRECATED: Prefer squared distance comparisons for performance
   */
  private calculateDistance(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    // PERFORMANCE: sqrt required here - actual distance value needed by caller
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
