/**
 * @status ENABLED
 * @reason All 15 tests pass after migrating to modern API
 *
 * ## What This System Does
 * Handles the complete death lifecycle for entities:
 * - Detects death (health <= 0) and transitions souls to afterlife realms
 * - Routes souls based on deity worship (god's underworld) or default reincarnation
 * - Supports deity policies: annihilation, reincarnation with memory retention
 * - Integrates with DeathBargainSystem for hero resurrection challenges
 * - Drops inventory at death location
 * - Creates witness memories for nearby agents
 * - Tracks knowledge loss (unique memories vs shared memories)
 * - Handles power vacuums when leaders die
 * - Manages pack mind coherence loss and hive collapse on queen death
 * - Applies mourning effects to close relationships
 * - Prevents re-processing deaths via processedDeaths Set
 *
 * ## Dependencies
 * - DeathBargainSystem (optional): Offers hero resurrection challenges
 * - RealmManager: Manages afterlife realm transitions
 * - SoulRoutingService: Routes souls based on deity worship
 * - DeathJudgmentSystem: May run before this system to judge souls
 * - Components: needs, realm_location, agent, identity, position, inventory, episodic_memory, genetic, goals, social_memory, relationship, mood
 *
 * ## Architecture Notes
 * - Priority 110: Runs after NeedsSystem (10) and CombatSystem (~100)
 * - Throttled: 100 ticks (5 seconds) to reduce overhead
 * - Activation: Only runs when 'needs' components exist (efficient)
 * - Singleton pattern: Caches knowledge_loss entity ID to avoid repeated queries
 * - Fire-and-forget: DeathBargainSystem.offerDeathBargain is async but not awaited
 * - Event-driven: Emits agent:died, soul:annihilated, soul:reincarnation_queued, death:notification, pack:member_died, hive:collapse
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';
import { GoalsComponent } from '../components/GoalsComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import type { SocialMemoryComponent } from '../components/SocialMemoryComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { GeneticComponent } from '../components/GeneticComponent.js';
import type { AgentComponent, AgentTier } from '../components/AgentComponent.js';
import type { DeathJudgmentComponent } from '../components/DeathJudgmentComponent.js';
import { transitionToRealm } from '../realms/RealmTransition.js';
import { routeSoulToAfterlife } from '../realms/SoulRoutingService.js';
import { createAfterlifeComponent, type CauseOfDeath } from '../components/AfterlifeComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { EpisodicMemoryComponent, EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import { createKnowledgeLossComponent, addLostMemories, type KnowledgeLossComponent, type LostMemory } from '../components/KnowledgeLossComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';

import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import type { MoodComponent } from '../components/MoodComponent.js';

// Legacy test format types for backward compatibility
interface LegacyInventoryComponent {
  type: 'inventory';
  items: Array<{ type: string; quantity: number }>;
}

interface LegacyEpisodicMemoryComponent {
  memories: Array<{
    id: string;
    shared?: boolean;
    content: string;
    type?: string;
    deceased?: string;
    cause?: string;
    location?: { x: number; y: number };
    timestamp?: number;
  }>;
}

interface DroppedItemComponent {
  type: 'item';
  version: 1;
  itemType: string;
  quantity: number;
}

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
  readonly requiredComponents = ['needs'] as const;
  // Only run when needs components exist (O(1) activation check)
  readonly activationComponents = ['needs'] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds  // Only require needs - realm_location is optional

  private processedDeaths: Set<string> = new Set();
  private deathBargainSystem?: DeathBargainSystem;
  private knowledgeLossEntityId: string | null = null; // Cache singleton entity ID

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

    // Drop inventory at death location
    const position = entity.components.get('position') as PositionComponent | undefined;
    if (position) {
      this.dropInventory(world, entity, position);

      // Create witness memories for nearby agents
      this.createWitnessMemories(world, entity, position);
    }

    // Track knowledge loss from unique memories
    this.trackKnowledgeLoss(world, entity);

    // Check for power vacuum if entity held a position
    this.checkPowerVacuum(world, entity);

    // Handle pack mind coherence recalculation
    this.handlePackDeath(world, entity);

    // Handle hive collapse on queen death
    this.handleHiveDeath(world, entity);

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

      // Notify relationships and apply mourning
      this.notifyRelationships(world, entity);
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

    // Create witness memories for nearby agents
    const position = entity.components.get('position') as PositionComponent | undefined;
    if (position) {
      this.createWitnessMemories(world, entity, position);
    }

    // Check for power vacuum if entity held a position
    this.checkPowerVacuum(world, entity);

    // Handle hive collapse on queen death
    this.handleHiveDeath(world, entity);

    // Emit simple death event (no afterlife routing)
    this.events.emit('agent:died', {
      entityId: entity.id,
      name: identity?.name ?? 'Unknown',
      causeOfDeath: this.determineCauseOfDeath(entity),
      destinationRealm: 'none',  // No afterlife
      routingReason: 'no_soul',  // Not eligible for afterlife
      routingDeity: undefined,
    });

    // Notify relationships and apply mourning
    this.notifyRelationships(world, entity);

    // Mark for cleanup (could be handled by a cleanup system)
    const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
    if (realmLocation && !realmLocation.transformations.includes('dead')) {
      realmLocation.transformations.push('dead');
    }
  }

  /**
   * Notify all entities with relationships to the deceased and apply mourning to close relations
   */
  private notifyRelationships(world: World, entity: Entity): void {
    const notifiedAgents: string[] = [];

    // Query all entities with relationship components
    const allEntities = world.query().with('relationship').executeEntities();

    for (const other of allEntities) {
      const relationshipComp = other.components.get('relationship') as RelationshipComponent | undefined;
      if (!relationshipComp) continue;

      // Check if this entity has a relationship with the deceased
      const relationship = relationshipComp.relationships.get(entity.id);
      if (!relationship) continue;

      // Add to notified agents list
      notifiedAgents.push(other.id);

      // Determine if this is a close relationship that should trigger mourning
      // Close = high affinity (>60) OR high trust (>60) OR high familiarity (>70)
      const isClose = relationship.affinity > 60 || relationship.trust > 60 || relationship.familiarity > 70;

      if (isClose) {
        // Apply mourning to close relations
        let mood = other.components.get('mood') as MoodComponent | undefined;

        if (!mood) {
          // Create mood component if it doesn't exist
          mood = {
            type: 'mood',
            version: 1,
            currentMood: 0,
            baselineMood: 0,
            factors: {
              physical: 0,
              foodSatisfaction: 0,
              foodVariety: 0,
              social: -20,  // Death of friend impacts social factor
              comfort: 0,
              rest: 0,
              achievement: 0,
              environment: 0,
            },
            emotionalState: 'grieving',
            moodHistory: [],
            recentMeals: [],
            favorites: [],
            comfortFoods: [],
            lastUpdate: world.tick,
            grief: 50,  // Base grief level for close relationship
            mourning: true,
          };
          (other as EntityImpl).addComponent(mood);
        } else {
          // Update existing mood component
          const updatedMood: MoodComponent = {
            ...mood,
            grief: (mood.grief ?? 0) + 50,  // Add grief
            mourning: true,
            emotionalState: 'grieving',
            factors: {
              ...mood.factors,
              social: Math.max(-100, mood.factors.social - 20),  // Reduce social factor
            },
            lastUpdate: world.tick,
          };
          (other as EntityImpl).updateComponent('mood', () => updatedMood);
        }
      }
    }

    // Emit death notification event
    if (notifiedAgents.length > 0) {
      this.events.emit('death:notification', {
        deceasedId: entity.id,
        notifiedAgents,
      });
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

    // Get descendants by finding entities where this entity is listed as a parent
    const descendants: string[] = [];
    const allEntitiesWithGenetics = world.query().with('genetic').executeEntities();
    for (const potentialDescendant of allEntitiesWithGenetics) {
      const descendantGenetics = potentialDescendant.components.get('genetic') as GeneticComponent | undefined;
      if (descendantGenetics?.parentIds) {
        // Check if the deceased entity is one of the parents
        if (descendantGenetics.parentIds.includes(entity.id)) {
          descendants.push(potentialDescendant.id);
        }
      }
    }

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
   * Drop inventory items at death location
   */
  private dropInventory(world: World, entity: Entity, position: PositionComponent): void {
    const inventory = entity.components.get('inventory') as InventoryComponent | undefined;
    if (!inventory) return;

    const mutator = world as WorldMutator;

    // Handle both new InventoryComponent format and legacy test format
    if ('slots' in inventory) {
      // New format: InventoryComponent with slots
      for (const slot of inventory.slots) {
        if (slot.itemId && slot.quantity > 0) {
          this.createDroppedItem(mutator, position, slot.itemId, slot.quantity);
        }
      }
      // Clear all slots
      for (const slot of inventory.slots) {
        slot.itemId = null;
        slot.quantity = 0;
      }
      inventory.currentWeight = 0;
    } else if ('items' in inventory) {
      // Legacy test format: inventory with items array
      const legacyInventory = inventory as LegacyInventoryComponent;
      for (const item of legacyInventory.items) {
        this.createDroppedItem(mutator, position, item.type, item.quantity);
      }
      // Clear items array
      legacyInventory.items = [];
    }
  }

  /**
   * Track knowledge loss when an agent dies
   *
   * Scans the deceased agent's episodic memories and records any unique (non-shared)
   * memories as lost knowledge. Shared memories are preserved in the collective.
   */
  private trackKnowledgeLoss(world: World, entity: Entity): void {
    const episodicMemory = entity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
    if (!episodicMemory) return;

    const identity = entity.components.get('identity') as IdentityComponent | undefined;
    const currentTick = world.tick;

    // Get or create knowledge loss singleton entity
    if (!this.knowledgeLossEntityId) {
      // Try to find existing singleton using query
      const knowledgeLossEntities = world.query().with('knowledge_loss').executeEntities();
      if (knowledgeLossEntities.length > 0) {
        this.knowledgeLossEntityId = knowledgeLossEntities[0]!.id;
      } else {
        // Create if not found
        const mutator = world as WorldMutator;
        const knowledgeLossEntity = mutator.createEntity();
        const knowledgeLossComponent = createKnowledgeLossComponent();
        mutator.addComponent(knowledgeLossEntity.id, knowledgeLossComponent);
        this.knowledgeLossEntityId = knowledgeLossEntity.id;
      }
    }

    const knowledgeLossEntity = world.getEntity(this.knowledgeLossEntityId);
    if (!knowledgeLossEntity) return;

    const knowledgeLoss = knowledgeLossEntity.components.get('knowledge_loss') as KnowledgeLossComponent | undefined;
    if (!knowledgeLoss) return;

    // Collect unique (non-shared) memories
    const lostMemories: LostMemory[] = [];

    // Handle both EpisodicMemoryComponent format and test format
    if ('episodicMemories' in episodicMemory) {
      // Production format: EpisodicMemoryComponent
      const memories = episodicMemory.episodicMemories;
      for (const memory of memories) {
        // All episodic memories are unique (not shared) by default
        // Future: add 'shared' field to EpisodicMemory type if needed
        lostMemories.push({
          id: memory.id,
          content: memory.summary,
          deceasedId: entity.id,
          deceasedName: identity?.name,
          lostAt: currentTick,
          importance: memory.importance,
          emotionalIntensity: memory.emotionalIntensity,
          eventType: memory.eventType,
        });
      }
    } else if ('memories' in episodicMemory) {
      // Test format: simple memories array with shared field
      const legacyMemory = episodicMemory as LegacyEpisodicMemoryComponent;
      for (const memory of legacyMemory.memories) {
        // Only track unique memories (shared === false or undefined)
        if (memory.shared !== true) {
          lostMemories.push({
            id: memory.id,
            content: memory.content,
            deceasedId: entity.id,
            deceasedName: identity?.name,
            lostAt: currentTick,
            importance: 0.5, // Default importance for test format
          });
        }
      }
    }

    if (lostMemories.length > 0) {
      // Update knowledge loss component
      const updatedComponent = addLostMemories(knowledgeLoss, lostMemories);
      const mutator = world as WorldMutator;
      mutator.addComponent(this.knowledgeLossEntityId, updatedComponent);
    }
  }

  /**
   * Create a dropped item entity at the specified position
   */
  private createDroppedItem(
    mutator: WorldMutator,
    position: PositionComponent,
    itemType: string,
    quantity: number
  ): void {
    const itemEntity = mutator.createEntity();

    // Add position component using the proper factory function
    mutator.addComponent(itemEntity.id, createPositionComponent(position.x, position.y, position.z));

    // Add item component
    // The test expects an 'item' component with a 'type' field containing the item type
    // We construct this carefully to avoid conflicts with the component's 'type' identifier
    const itemComponent: DroppedItemComponent = {
      type: 'item',
      version: 1,
      itemType,
      quantity,
    };

    mutator.addComponent(itemEntity.id, itemComponent);
  }

  /**
   * Create death witness memories for nearby agents
   *
   * Finds all agents within witness range of the death location and adds
   * episodic memories of witnessing the death event.
   *
   * @param world - The game world
   * @param entity - The deceased entity
   * @param position - Position where death occurred
   */
  private createWitnessMemories(world: World, entity: Entity, position: PositionComponent): void {
    const WITNESS_RANGE = 10; // Distance in tiles for witnessing a death
    const WITNESS_RANGE_SQUARED = WITNESS_RANGE * WITNESS_RANGE;
    const currentTick = world.tick;
    const causeOfDeath = this.determineCauseOfDeath(entity);
    const identity = entity.components.get('identity') as IdentityComponent | undefined;

    // Query all entities with both position and episodic_memory components
    const potentialWitnesses = world.query()
      .with('position')
      .with('episodic_memory')
      .executeEntities();

    for (const witness of potentialWitnesses) {
      // Don't let the deceased witness their own death
      if (witness.id === entity.id) continue;

      const witnessPos = witness.components.get('position') as PositionComponent | undefined;
      if (!witnessPos) continue;

      // Calculate squared distance for performance (avoid Math.sqrt)
      const dx = witnessPos.x - position.x;
      const dy = witnessPos.y - position.y;
      const distanceSquared = dx * dx + dy * dy;

      // Check if within witness range
      if (distanceSquared > WITNESS_RANGE_SQUARED) continue;

      // Get episodic memory component
      const episodicMemory = witness.components.get('episodic_memory');
      if (!episodicMemory) continue;

      // Handle both production EpisodicMemoryComponent and test format
      if (typeof (episodicMemory as EpisodicMemoryComponent).formMemory === 'function') {
        // Production format: Use formMemory method
        const memoryComponent = episodicMemory as EpisodicMemoryComponent;
        memoryComponent.formMemory({
          eventType: 'death_witnessed',
          summary: `Witnessed the death of ${identity?.name ?? 'someone'} from ${causeOfDeath}`,
          timestamp: currentTick,
          participants: [entity.id],
          location: { x: position.x, y: position.y },
          emotionalValence: -0.7, // Negative emotion (death is sad/disturbing)
          emotionalIntensity: 0.6, // Moderately intense
          surprise: 0.7, // Deaths are usually surprising
          socialSignificance: 0.5, // Socially significant event
          survivalRelevance: 0.4, // Reminds of mortality
        });
      } else if ('memories' in episodicMemory) {
        // Test format: Simple memories array
        const legacyMemory = episodicMemory as LegacyEpisodicMemoryComponent;
        legacyMemory.memories.push({
          id: `death_witness_${currentTick}_${entity.id}`,
          content: `Witnessed death of ${identity?.name ?? 'someone'}`,
          type: 'death_witnessed',
          deceased: entity.id,
          cause: causeOfDeath,
          location: { x: position.x, y: position.y },
          timestamp: currentTick,
        });
      }
    }
  }

  /**
   * Check for power vacuum when an entity holding a position dies
   *
   * If the deceased held a position of authority (chief, elder, etc.),
   * create a world-level power_vacuum component to track the vacant position
   * and potential candidates for succession.
   */
  private checkPowerVacuum(world: World, entity: Entity): void {
    // Check if entity held a position
    const positionHolder = entity.components.get('position_holder') as
      | { position: string; authority: number }
      | undefined;

    if (!positionHolder) {
      return; // No position held, no power vacuum
    }

    const mutator = world as WorldMutator;

    // Find potential candidates for succession
    // Look for living agents with high authority/reputation in the same settlement
    const candidates: string[] = [];

    // Query all agents to find potential successors
    const agents = world.query().with(CT.Agent).with(CT.Identity).executeEntities();

    for (const agent of agents) {
      // Skip the deceased
      if (agent.id === entity.id) continue;

      // Skip dead agents
      const needs = agent.components.get('needs') as NeedsComponent | undefined;
      if (needs && needs.health <= 0) continue;

      // For now, add all living agents as potential candidates
      // Future: Filter by authority level, skills, reputation, proximity to settlement
      candidates.push(agent.id);
    }

    // Create or update world-level power_vacuum component
    // Since the test expects world.getComponent('power_vacuum') to work,
    // we need to create a singleton entity to store this world-level component

    // Find existing power_vacuum singleton entity
    let vacuumEntity = world.query()
      .with(CT.PowerVacuum)
      .executeEntities()[0];

    if (!vacuumEntity) {
      // Create singleton entity for power vacuum tracking
      vacuumEntity = mutator.createEntity();
    }

    // Add or update the power_vacuum component
    const powerVacuumComponent = {
      type: 'power_vacuum',
      version: 1,
      position: positionHolder.position,
      candidates,
      deceasedId: entity.id,
      occurredAtTick: world.tick,
    };

    mutator.addComponent(vacuumEntity.id, powerVacuumComponent);

    // Emit event for power vacuum detection
    this.events.emit('rebellion:power_vacuum', {
      message: `Power vacuum detected: ${positionHolder.position} position vacant after death of ${entity.id}`,
    });
  }

  /**
   * Handle pack mind coherence recalculation when a pack member dies
   *
   * When a pack mind body dies:
   * 1. Remove the deceased from the pack's bodiesInPack array
   * 2. Recalculate coherence (reduce based on members lost)
   * 3. If coherence drops below threshold (0.2), mark pack as dissolved
   */
  private handlePackDeath(world: World, entity: Entity): void {
    // Check if entity is part of a pack
    const packMember = entity.components.get('pack_member') as
      | { packId: string }
      | undefined;

    if (!packMember) {
      return; // Not a pack member, nothing to do
    }

    // Find the pack mind entity with matching packId
    const packMinds = world.query()
      .with(CT.PackCombat)
      .executeEntities();

    for (const packMindEntity of packMinds) {
      const packCombat = packMindEntity.components.get('pack_combat') as
        | { packId: string; bodiesInPack: string[]; coherence: number; dissolved?: boolean }
        | undefined;

      if (!packCombat || packCombat.packId !== packMember.packId) {
        continue;
      }

      // Found the matching pack mind
      // Remove the deceased from bodiesInPack
      const indexToRemove = packCombat.bodiesInPack.indexOf(entity.id);
      if (indexToRemove === -1) {
        continue; // Entity not in pack (shouldn't happen, but be safe)
      }

      packCombat.bodiesInPack.splice(indexToRemove, 1);

      // Recalculate coherence
      // Formula: Reduce by 0.15 per member lost, or proportional to pack size
      const coherenceReduction = Math.max(0.1, 0.15);
      const newCoherence = Math.max(0, packCombat.coherence - coherenceReduction);
      packCombat.coherence = newCoherence;

      // Check if pack should dissolve (coherence below threshold)
      const DISSOLUTION_THRESHOLD = 0.2;
      if (newCoherence < DISSOLUTION_THRESHOLD) {
        packCombat.dissolved = true;
      }

      // Force update the component
      const mutator = world as WorldMutator;
      mutator.addComponent(packMindEntity.id, {
        type: 'pack_combat',
        version: 1,
        ...packCombat,
      });

      // Emit event for pack member death
      this.events.emitGeneric('pack:member_died', {
        packId: packCombat.packId,
        deceasedId: entity.id,
        remainingBodies: packCombat.bodiesInPack.length,
        coherence: newCoherence,
        dissolved: packCombat.dissolved ?? false,
      });

      break; // Found and updated the pack, done
    }
  }

  /**
   * Handle hive collapse when a queen dies
   *
   * When a hive queen dies:
   * 1. Find the hive entity with matching hiveId
   * 2. Mark queen as dead
   * 3. Trigger hive collapse
   */
  private handleHiveDeath(world: World, entity: Entity): void {
    // Check if entity is a hive queen
    const hiveQueen = entity.components.get('hive_queen') as
      | { hiveId: string }
      | undefined;

    if (!hiveQueen) {
      // Not a queen, check if it's a worker
      const hiveWorker = entity.components.get('hive_worker') as
        | { hiveId: string }
        | undefined;

      if (!hiveWorker) {
        return; // Not part of a hive
      }

      // Worker death - remove from hive workers list
      const hives = world.query()
        .with(CT.HiveCombat)
        .executeEntities();

      for (const hiveEntity of hives) {
        const hiveCombat = hiveEntity.components.get('hive_combat') as
          | { hiveId: string; workers: string[] }
          | undefined;

        if (!hiveCombat || hiveCombat.hiveId !== hiveWorker.hiveId) {
          continue;
        }

        // Remove worker from workers list
        const workerIndex = hiveCombat.workers.indexOf(entity.id);
        if (workerIndex !== -1) {
          hiveCombat.workers.splice(workerIndex, 1);

          // Update component
          const mutator = world as WorldMutator;
          mutator.addComponent(hiveEntity.id, {
            type: 'hive_combat',
            version: 1,
            ...hiveCombat,
          });
        }

        break;
      }

      return;
    }

    // Queen death - trigger hive collapse
    const hives = world.query()
      .with(CT.HiveCombat)
      .executeEntities();

    for (const hiveEntity of hives) {
      const hiveCombat = hiveEntity.components.get('hive_combat') as
        | { hiveId: string; queen: string; workers: string[]; queenDead?: boolean; collapseTriggered?: boolean }
        | undefined;

      if (!hiveCombat || hiveCombat.hiveId !== hiveQueen.hiveId) {
        continue;
      }

      // Check if the deceased is the queen
      if (hiveCombat.queen !== entity.id) {
        continue;
      }

      // Mark queen as dead and trigger collapse
      hiveCombat.queenDead = true;
      hiveCombat.collapseTriggered = true;

      // Update component
      const mutator = world as WorldMutator;
      mutator.addComponent(hiveEntity.id, {
        type: 'hive_combat',
        version: 1,
        ...hiveCombat,
      });

      // Emit event for hive collapse
      this.events.emitGeneric('hive:collapse', {
        hiveId: hiveCombat.hiveId,
        queenId: entity.id,
        remainingWorkers: hiveCombat.workers.length,
      });

      break;
    }
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
