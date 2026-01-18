import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';
import { GoalsComponent } from '../components/GoalsComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { SocialMemoryComponent } from '../components/SocialMemoryComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { GeneticComponent } from '../components/GeneticComponent.js';
import type { AgentComponent, AgentTier } from '../components/AgentComponent.js';
import type { DeathJudgmentComponent } from '../components/DeathJudgmentComponent.js';
import { transitionToRealm } from '../realms/RealmTransition.js';
import { routeSoulToAfterlife } from '../realms/SoulRoutingService.js';
import { createAfterlifeComponent, type CauseOfDeath } from '../components/AfterlifeComponent.js';

/** Agent tiers that get full afterlife experience */
const AFTERLIFE_ELIGIBLE_TIERS: AgentTier[] = ['full', 'reduced'];

// Import for type only
import type { DeathBargainSystem } from './DeathBargainSystem.js';

/**
 * DeathTransitionSystem - Handles transitioning dead entities to the Underworld
 *
 * Responsible for:
 * - Detecting when entities die (health <= 0)
 * - Transitioning dead entities to the Underworld realm
 * - Marking entities as dead in their realm location
 *
 * This implements the core "death portal" mechanic where dying automatically
 * sends entities to the Underworld.
 */
export class DeathTransitionSystem extends BaseSystem {
  readonly id: SystemId = 'death_transition';
  readonly priority: number = 110;  // Run after needs/combat systems
  readonly requiredComponents = ['needs'] as const;  // Only require needs - realm_location is optional

  private processedDeaths: Set<string> = new Set();
  private deathBargainSystem?: DeathBargainSystem;

  /**
   * Set the death bargain system for hero resurrection challenges
   */
  setDeathBargainSystem(system: DeathBargainSystem): void {
    this.deathBargainSystem = system;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Check for newly dead entities
    for (const entity of ctx.activeEntities) {
      const needs = entity.components.get('needs') as NeedsComponent | undefined;
      if (!needs) continue;

      // Get or create realm location - agents in mortal world may not have this yet
      let realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
      if (!realmLocation) {
        // Create default realm location for mortal world entities
        realmLocation = {
          type: 'realm_location',
          version: 1,
          currentRealmId: 'mortal_world',
          enteredAt: 0,
          totalTimeInRealm: 0,
          timeDilation: 1.0,
          canExit: true,
          transformations: [],
        };
        (entity as EntityImpl).addComponent(realmLocation);
      }

      // Check if entity just died (health <= 0 and not already processed)
      const isDead = needs.health <= 0;
      const alreadyProcessed = this.processedDeaths.has(entity.id);

      // Check if death judgment is in progress
      const deathJudgment = entity.components.get('death_judgment') as DeathJudgmentComponent | undefined;
      const judgmentInProgress = deathJudgment && deathJudgment.stage !== 'crossing_over';

      if (isDead && !alreadyProcessed && !judgmentInProgress) {
        this.handleDeath(ctx.world, entity.id, realmLocation);
        this.processedDeaths.add(entity.id);
      }

      // Clean up processed deaths list for resurrected entities
      if (!isDead && alreadyProcessed) {
        this.processedDeaths.delete(entity.id);
      }
    }
  }

  /**
   * Handle entity death by transitioning to appropriate afterlife realm
   *
   * Only full/reduced tier LLM agents get the full afterlife experience.
   * Autonomic NPCs are simply removed from the world (no soul to save).
   *
   * Routes souls based on their religious beliefs:
   * - Worshippers go to their deity's underworld realm
   * - Unbelievers go to the default Underworld
   */
  private handleDeath(world: World, entityId: string, realmLocation: RealmLocationComponent): void {
    const entity = world.getEntity(entityId);
    if (!entity) return;

    // Check if this entity qualifies for afterlife (full/reduced tier agents only)
    const agent = entity.components.get('agent') as AgentComponent | undefined;
    const tier = agent?.tier ?? (agent?.useLLM ? 'full' : 'autonomic');

    if (!AFTERLIFE_ELIGIBLE_TIERS.includes(tier)) {
      // Autonomic NPCs don't get afterlife - just emit death event and let them despawn
      this.handleSimpleDeath(world, entity);
      return;
    }

    // Route the soul to the appropriate afterlife
    const routing = routeSoulToAfterlife(world, entity);

    // Handle special policy outcomes
    if (routing.annihilate) {
      this.handleAnnihilation(world, entity, routing);
      return;
    }

    if (routing.policyType === 'reincarnation') {
      this.handleReincarnation(world, entity, routing);
      return;
    }

    // Ensouled agents without a deity always reincarnate
    // This ensures ensouled souls are prioritized for continuation
    if (routing.reason === 'no_deity' || routing.reason === 'deity_no_policy') {
      this.handleDefaultReincarnation(world, entity);
      return;
    }

    const targetRealm = routing.realmId;

    // Skip if already in an afterlife realm
    if (realmLocation.currentRealmId === targetRealm) {
      return;
    }

    // Check if hero qualifies for death bargain (chance to cheat death)
    // The God of Death decides based on entertainment value (not random chance!)
    if (this.deathBargainSystem && this.deathBargainSystem.qualifiesForDeathBargain(entity, world)) {
      const position = entity.components.get('position') as PositionComponent | undefined;
      const deathLocation = position ? { x: position.x, y: position.y } : { x: 0, y: 0 };
      const causeOfDeath = this.determineCauseOfDeath(entity);

      // Offer bargain (async but we don't await - it's a fire-and-forget)
      this.deathBargainSystem.offerDeathBargain(world, entity, deathLocation, causeOfDeath);

      // Don't transition to afterlife yet - wait for bargain resolution
      return;
    }

    // Create AfterlifeComponent for the soul
    this.createAfterlifeForEntity(world, entity);

    // Attempt transition to afterlife via death access method
    const result = transitionToRealm(
      world,
      entityId,
      targetRealm,
      'death'
    );

    if (result.success) {
      // Prevent entity from leaving the Underworld unless resurrected/allowed by gods
      realmLocation.canExit = false;

      // Add death transformation marker
      if (!realmLocation.transformations.includes('dead')) {
        realmLocation.transformations.push('dead');
      }

      // Emit death event with destination realm info
      const identity = entity.components.get('identity') as IdentityComponent | undefined;
      this.events.emit('agent:died', {
        entityId,
        name: identity?.name ?? 'Unknown',
        causeOfDeath: this.determineCauseOfDeath(entity),
        destinationRealm: targetRealm,
        routingReason: routing.reason,
        routingDeity: routing.deityId,
      });
    }
  }

  /**
   * Handle annihilation policy - soul ceases to exist
   */
  private handleAnnihilation(world: World, entity: Entity, routing: ReturnType<typeof routeSoulToAfterlife>): void {
    const identity = entity.components.get('identity') as IdentityComponent | undefined;

    // Emit annihilation event
    this.events.emit('agent:died', {
      entityId: entity.id,
      name: identity?.name ?? 'Unknown',
      causeOfDeath: this.determineCauseOfDeath(entity),
      destinationRealm: 'annihilation',
      routingReason: routing.reason,
      routingDeity: routing.deityId,
    });

    // Emit specific soul annihilation event
    this.events.emit('soul:annihilated', {
      entityId: entity.id,
      deityId: routing.deityId,
      context: routing.context,
    });

    // Entity will be cleaned up by world (no afterlife, no transition)
  }

  /**
   * Handle reincarnation policy - soul is queued for rebirth
   */
  private handleReincarnation(world: World, entity: Entity, routing: ReturnType<typeof routeSoulToAfterlife>): void {
    const identity = entity.components.get('identity') as IdentityComponent | undefined;
    const config = routing.reincarnationConfig;

    // Emit death event with reincarnation destination
    this.events.emit('agent:died', {
      entityId: entity.id,
      name: identity?.name ?? 'Unknown',
      causeOfDeath: this.determineCauseOfDeath(entity),
      destinationRealm: 'reincarnation',
      routingReason: routing.reason,
      routingDeity: routing.deityId,
    });

    // Emit reincarnation queued event - ReincarnationSystem will handle spawning new entity
    this.events.emit('soul:reincarnation_queued', {
      entityId: entity.id,
      deityId: routing.deityId,
      target: config?.target ?? 'same_world',
      memoryRetention: config?.memoryRetention ?? 'none',
      speciesConstraint: config?.speciesConstraint ?? 'any',
      minimumDelay: config?.minimumDelay ?? 1000,
      maximumDelay: config?.maximumDelay ?? 10000,
    });
  }

  /**
   * Handle default reincarnation for ensouled agents without deity-specified policy
   *
   * Gives unaffiliated souls a second chance at life with some memory fragments
   * retained. This prioritizes ensouled agents by keeping them in the simulation.
   */
  private handleDefaultReincarnation(world: World, entity: Entity): void {
    const identity = entity.components.get('identity') as IdentityComponent | undefined;

    // Emit death event with reincarnation destination
    this.events.emit('agent:died', {
      entityId: entity.id,
      name: identity?.name ?? 'Unknown',
      causeOfDeath: this.determineCauseOfDeath(entity),
      destinationRealm: 'reincarnation',
      routingReason: 'default_reincarnation',
      routingDeity: undefined,
    });

    // Queue for reincarnation with default settings that preserve some identity
    // Ensouled agents get fragment memory retention to maintain some continuity
    this.events.emit('soul:reincarnation_queued', {
      entityId: entity.id,
      deityId: undefined,
      target: 'same_world',
      memoryRetention: 'fragments',  // Keep some memories for ensouled souls
      speciesConstraint: 'same',     // Stay the same species
      minimumDelay: 500,             // Faster rebirth for unaffiliated souls
      maximumDelay: 3000,
    });
  }

  /**
   * Handle death for entities that don't qualify for afterlife (autonomic NPCs)
   *
   * These entities simply emit a death event and can be cleaned up by the world.
   * No soul, no afterlife - just gone.
   */
  private handleSimpleDeath(world: World, entity: Entity): void {
    const identity = entity.components.get('identity') as IdentityComponent | undefined;

    // Emit simple death event (no afterlife routing)
    this.events.emit('agent:died', {
      entityId: entity.id,
      name: identity?.name ?? 'Unknown',
      causeOfDeath: this.determineCauseOfDeath(entity),
      destinationRealm: 'none',  // No afterlife
      routingReason: 'no_soul',  // Not eligible for afterlife
      routingDeity: undefined,
    });

    // Mark for cleanup (could be handled by a cleanup system)
    const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
    if (realmLocation && !realmLocation.transformations.includes('dead')) {
      realmLocation.transformations.push('dead');
    }
  }

  /**
   * Create an AfterlifeComponent for a dying entity
   */
  private createAfterlifeForEntity(world: World, entity: Entity): void {
    // Skip if already has afterlife component
    if (entity.components.has('afterlife')) return;

    const position = entity.components.get('position') as PositionComponent | undefined;
    const goals = entity.components.get('goals') as GoalsComponent | undefined;
    const socialMemory = entity.components.get('social_memory') as SocialMemoryComponent | undefined;
    const identity = entity.components.get('identity') as IdentityComponent | undefined;
    const genetics = entity.components.get('genetic') as GeneticComponent | undefined;

    // Get current tick from world
    const currentTick = world.tick;

    // Determine cause of death
    const causeOfDeath = this.determineCauseOfDeath(entity);

    // Get unfinished goals
    const unfinishedGoals: string[] = [];
    if (goals instanceof GoalsComponent) {
      for (const goal of goals.getActiveGoals()) {
        if (!goal.completed) {
          unfinishedGoals.push(goal.id);
        }
      }
    }

    // Get important relationships
    const unresolvedRelationships: string[] = [];
    if (socialMemory?.socialMemories) {
      for (const [agentId, memory] of socialMemory.socialMemories) {
        // Include relationships with high interaction count or strong sentiment
        if (memory.interactionCount > 5 || Math.abs(memory.overallSentiment) > 0.5) {
          unresolvedRelationships.push(agentId);
        }
      }
    }

    // TODO: Get descendants from family tree system when implemented
    const descendants: string[] = [];

    // Create the afterlife component
    const afterlife = createAfterlifeComponent({
      causeOfDeath,
      deathTick: currentTick,
      deathLocation: position ? { x: position.x, y: position.y } : { x: 0, y: 0 },
      deathMemory: `Died of ${causeOfDeath} in the ${identity?.name ? identity.name + "'s" : ''} mortal life`,
      unfinishedGoals,
      unresolvedRelationships,
      descendants,
      familyName: identity?.name?.split(' ').pop(),  // Last name as family name
      bloodlineId: genetics?.parentIds?.[0],  // Use first parent ID as lineage identifier
    });

    // Add the component to the entity
    (entity as EntityImpl).addComponent(afterlife);
  }

  /**
   * Determine cause of death from entity state
   */
  private determineCauseOfDeath(entity: Entity): CauseOfDeath {
    const needs = entity.components.get('needs') as NeedsComponent | undefined;

    if (!needs) return 'unknown';

    // Check for starvation
    if (needs.hunger <= 0) return 'starvation';

    // Check for exposure (temperature extremes)
    if (needs.temperature < 30 || needs.temperature > 42) return 'exposure';

    // Check for combat damage (low health with no other obvious cause)
    if (needs.health <= 0 && needs.hunger > 0.1 && needs.energy > 0.1) {
      return 'combat';
    }

    // Default to unknown
    return 'unknown';
  }

  /**
   * Clear processed deaths (useful for testing/debugging)
   */
  clearProcessedDeaths(): void {
    this.processedDeaths.clear();
  }

  /**
   * Check if an entity's death has been processed
   */
  hasProcessedDeath(entityId: string): boolean {
    return this.processedDeaths.has(entityId);
  }
}
