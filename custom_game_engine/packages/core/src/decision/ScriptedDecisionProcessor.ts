/**
 * ScriptedDecisionProcessor - Handles scripted behavior decisions for non-LLM agents
 *
 * This processor manages behavior transitions for scripted agents based on
 * needs, inventory, and nearby entities.
 *
 * Part of Phase 4 of the AISystem decomposition (work-order: ai-system-refactor)
 */
import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent, AgentBehavior, StrategicPriorities, PlannedBuild } from '../components/AgentComponent.js';
import { PLANNED_BUILD_REACH } from '../components/AgentComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import type { PlantComponent } from '../components/PlantComponent.js';
import type { ConversationComponent } from '../components/ConversationComponent.js';
import type { MagicComponent } from '../components/MagicComponent.js';
import { isHungry } from '../components/NeedsComponent.js';
import { isInConversation, startConversation } from '../components/ConversationComponent.js';
import { calculateFarmingContext, calculateFarmingUtilities, shouldFarm } from './FarmingUtilityCalculator.js';
import { calculateStorageStats, suggestBuildingFromStorage } from '../utils/StorageContext.js';
import { suggestSpells } from './SpellUtilityCalculator.js';
import { ComponentType } from '../types/ComponentType.js';
/**
 * Building cost lookup.
 * NOTE: These MUST match BuildingBlueprintRegistry resource costs.
 * When in doubt, check BuildingBlueprintRegistry.ts for authoritative values.
 */
const BUILDING_COSTS: Record<string, Record<string, number>> = {
  'storage-chest': { wood: 10 },
  'campfire': { wood: 5, stone: 10 },
  'lean-to': { wood: 10, leaves: 5 },
  'tent': { wood: 5, cloth: 10 },
  'workbench': { wood: 20 }, // Match BuildingBlueprintRegistry (20 wood, no stone)
  'bed': { wood: 10, plant_fiber: 15 },
  'well': { stone: 20, wood: 5 },
};
/**
 * Behavior candidates for priority-based selection
 */
interface BehaviorCandidate {
  behavior: AgentBehavior;
  behaviorState: Record<string, unknown>;
  category: keyof StrategicPriorities;
  baseWeight: number; // Context-based weight (0-1)
}
/**
 * Scripted decision result
 */
export interface ScriptedDecisionResult {
  changed: boolean;
  behavior?: AgentBehavior;
  behaviorState?: Record<string, unknown>;
}
/**
 * Resource target info
 */
interface ResourceTarget {
  type: string;
  distance: number;
  isPlant?: boolean;
}
/** Edible plant species */
const EDIBLE_SPECIES = ['berry-bush'];
/** Detection range for resources */
const DETECTION_RANGE = 15;
/**
 * ScriptedDecisionProcessor Class
 *
 * Handles behavior decisions for scripted (non-LLM) agents.
 *
 * Usage:
 * ```typescript
 * const processor = new ScriptedDecisionProcessor();
 *
 * // In update loop for scripted agents
 * const result = processor.process(entity, world, getNearbyAgents);
 * if (result.changed) {
 *   // Behavior was updated by processor
 * }
 * ```
 */
export class ScriptedDecisionProcessor {
  /**
   * Process scripted decision for an entity.
   */
  process(
    entity: EntityImpl,
    world: World,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): ScriptedDecisionResult {
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    if (!agent) return { changed: false };
    const needs = entity.getComponent<NeedsComponent>(ComponentType.Needs);
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
    const currentBehavior = agent.behavior;
    // Check hunger state
    if (needs && isHungry(needs) && currentBehavior !== 'seek_food') {
      // Switch to seeking food when hungry
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'seek_food',
        behaviorState: {},
      }));
      return { changed: true, behavior: 'seek_food', behaviorState: {} };
    }
    if (needs && !isHungry(needs) && currentBehavior === 'seek_food') {
      // Switch back to wandering when satisfied
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return { changed: true, behavior: 'wander', behaviorState: {} };
    }
    // PLANNED BUILD SYSTEM
    // If agent has planned builds, work toward them (gather resources or execute build)
    if (agent.plannedBuilds && agent.plannedBuilds.length > 0 && inventory) {
      const result = this.processPlannedBuilds(entity, world, agent.plannedBuilds, inventory);
      if (result) return result;
    }
    // PRIORITY-BASED BEHAVIOR SELECTION
    // If agent has strategic priorities set, use highest priority behavior
    // For city-influenced autonomic NPCs, use effectivePriorities (blended city + skill priorities)
    // Allow re-evaluation from exploration/social behaviors so agents can switch to gathering when resources appear
    const interruptibleBehaviors = ['wander', 'rest', 'idle', 'explore', 'explore_frontier', 'explore_spiral'];
    const activePriorities = agent.effectivePriorities ?? agent.priorities;
    if (activePriorities && interruptibleBehaviors.includes(currentBehavior)) {
      const result = this.selectPriorityBasedBehavior(entity, world, activePriorities, getNearbyAgents);
      if (result) return result;
    }
    // Autonomic resource gathering when wandering/resting/idle (fallback if no priorities)
    if ((currentBehavior === 'wander' || currentBehavior === 'rest' || currentBehavior === 'idle') && inventory && !activePriorities) {
      const result = this.checkResourceGathering(entity, world, inventory);
      if (result) return result;
    }
    // Stop gathering when we have enough
    if (currentBehavior === 'gather' && inventory) {
      const result = this.checkGatheringComplete(entity, inventory);
      if (result) return result;
    }
    // Social behaviors when idle
    if ((currentBehavior === 'wander' || currentBehavior === 'rest' || currentBehavior === 'idle') && Math.random() < 0.1) {
      const result = this.checkSocialBehavior(entity, world, getNearbyAgents);
      if (result) return result;
    }
    // Stop following randomly
    if (currentBehavior === 'follow_agent' && Math.random() < 0.05) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return { changed: true, behavior: 'wander', behaviorState: {} };
    }
    // Start conversation
    if ((currentBehavior === 'wander' || currentBehavior === 'rest' || currentBehavior === 'idle') && Math.random() < 0.08) {
      const result = this.checkConversation(entity, world, getNearbyAgents);
      if (result) return result;
    }
    // Gather seeds from plants
    if (currentBehavior === 'wander' && inventory && Math.random() < 0.35) {
      const result = this.checkSeedGathering(entity, world);
      if (result) return result;
    }
    // End conversation randomly
    if (currentBehavior === 'talk' && Math.random() < 0.03) {
      const result = this.checkEndConversation(entity, world);
      if (result) return result;
    }
    return { changed: false };
  }
  /**
   * Check if agent should start gathering resources.
   */
  private checkResourceGathering(
    entity: EntityImpl,
    world: World,
    inventory: InventoryComponent
  ): ScriptedDecisionResult | null {
    const hasWood = inventory.slots.some((s) => s.itemId === 'wood' && s.quantity >= 10);
    const hasStone = inventory.slots.some((s) => s.itemId === 'stone' && s.quantity >= 10);
    const hasFood = inventory.slots.some((s) => (s.itemId === 'food' || s.itemId === 'berry') && s.quantity >= 5);
    if (hasWood && hasStone && hasFood) {
      return null; // Have enough of everything
    }
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return null;
    // Track nearest resources of each type
    const nearest = this.findNearestResources(world, position, hasFood, hasWood, hasStone);
    // PRIORITY ORDER: food > wood > stone
    let targetResource: ResourceTarget | null = null;
    if (nearest.food && !hasFood) {
      targetResource = nearest.food;
    } else if (nearest.wood && !hasWood) {
      targetResource = nearest.wood;
    } else if (nearest.stone && !hasStone) {
      targetResource = nearest.stone;
    }
    if (targetResource) {
      // Use seek_food for plant-based food (handles harvest action)
      // Use gather for resource-based items
      const behavior = targetResource.isPlant ? 'seek_food' : 'gather';
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior,
        behaviorState: { resourceType: targetResource!.type },
      }));
      return { changed: true, behavior, behaviorState: { resourceType: targetResource.type } };
    }
    return null;
  }
  /**
   * Find nearest resources of each type within detection range.
   *
   * Performance: Uses chunk-based spatial lookup instead of querying all entities.
   * Only checks entities in nearby chunks based on DETECTION_RANGE.
   */
  private findNearestResources(
    world: World,
    position: PositionComponent,
    hasFood: boolean,
    hasWood: boolean,
    hasStone: boolean
  ): { food: ResourceTarget | null; wood: ResourceTarget | null; stone: ResourceTarget | null } {
    const result = { food: null as ResourceTarget | null, wood: null as ResourceTarget | null, stone: null as ResourceTarget | null };

    const CHUNK_SIZE = 32;
    const chunkX = Math.floor(position.x / CHUNK_SIZE);
    const chunkY = Math.floor(position.y / CHUNK_SIZE);
    const chunkRange = Math.ceil(DETECTION_RANGE / CHUNK_SIZE);

    // Check entities in nearby chunks
    for (let dx = -chunkRange; dx <= chunkRange; dx++) {
      for (let dy = -chunkRange; dy <= chunkRange; dy++) {
        const nearbyEntityIds = world.getEntitiesInChunk(chunkX + dx, chunkY + dy);

        for (const entityId of nearbyEntityIds) {
          const entity = world.entities.get(entityId);
          if (!entity) continue;

          const entityImpl = entity as EntityImpl;
          const entityPos = entityImpl.getComponent<PositionComponent>(ComponentType.Position);
          if (!entityPos) continue;

          // Manhattan distance early exit
          const manhattanDist = Math.abs(entityPos.x - position.x) + Math.abs(entityPos.y - position.y);
          if (manhattanDist > DETECTION_RANGE * 1.5) continue;

          // Check if it's a Resource
          const resourceComp = entityImpl.getComponent<ResourceComponent>(ComponentType.Resource);
          if (resourceComp && resourceComp.harvestable && resourceComp.amount > 0) {
            // Only consider resources we need
            if (resourceComp.resourceType === 'wood' && hasWood) continue;
            if (resourceComp.resourceType === 'stone' && hasStone) continue;
            if (resourceComp.resourceType === 'food' && hasFood) continue;

            const distance = this.distance(position, entityPos);
            if (distance > DETECTION_RANGE) continue;

            if (resourceComp.resourceType === 'food' && (!result.food || distance < result.food.distance)) {
              result.food = { type: 'food', distance, isPlant: false };
            } else if (resourceComp.resourceType === 'wood' && (!result.wood || distance < result.wood.distance)) {
              result.wood = { type: 'wood', distance };
            } else if (resourceComp.resourceType === 'stone' && (!result.stone || distance < result.stone.distance)) {
              result.stone = { type: 'stone', distance };
            }
            continue;
          }

          // Check if it's an edible Plant with fruit
          if (!hasFood) {
            const plantComp = entityImpl.getComponent<PlantComponent>(ComponentType.Plant);
            if (plantComp) {
              const isEdible = EDIBLE_SPECIES.includes(plantComp.speciesId);
              const hasFruit = plantComp.fruitCount > 0;
              const isHarvestable = ['fruiting', 'mature', 'seeding'].includes(plantComp.stage);

              if (isEdible && hasFruit && isHarvestable) {
                const distance = this.distance(position, entityPos);
                if (distance <= DETECTION_RANGE && (!result.food || distance < result.food.distance)) {
                  result.food = { type: 'food', distance, isPlant: true };
                }
              }
            }
          }
        }
      }
    }
    return result;
  }
  /**
   * Check if agent should stop gathering (has enough resources).
   */
  private checkGatheringComplete(
    entity: EntityImpl,
    inventory: InventoryComponent
  ): ScriptedDecisionResult | null {
    const hasWood = inventory.slots.some((s) => s.itemId === 'wood' && s.quantity >= 10);
    const hasStone = inventory.slots.some((s) => s.itemId === 'stone' && s.quantity >= 10);
    const hasFood = inventory.slots.some((s) => s.itemId === 'food' && s.quantity >= 5);
    if (hasWood && hasStone && hasFood) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return { changed: true, behavior: 'wander', behaviorState: {} };
    }
    return null;
  }
  /**
   * Check if agent should follow another agent.
   */
  private checkSocialBehavior(
    entity: EntityImpl,
    world: World,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): ScriptedDecisionResult | null {
    const nearbyAgents = getNearbyAgents(entity, world, 15);
    if (nearbyAgents.length > 0) {
      const targetAgent = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
      if (targetAgent) {
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behavior: 'follow_agent',
          behaviorState: { targetId: targetAgent.id },
        }));
        return { changed: true, behavior: 'follow_agent', behaviorState: { targetId: targetAgent.id } };
      }
    }
    return null;
  }
  /**
   * Check if agent should start a conversation.
   */
  private checkConversation(
    entity: EntityImpl,
    world: World,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): ScriptedDecisionResult | null {
    const conversation = entity.getComponent<ConversationComponent>(ComponentType.Conversation);
    if (!conversation || isInConversation(conversation)) return null;
    const nearbyAgents = getNearbyAgents(entity, world, 3); // Must be close (3 tiles)
    if (nearbyAgents.length === 0) return null;
    const targetAgent = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
    if (!targetAgent) return null;
    const targetImpl = targetAgent as EntityImpl;
    const targetConversation = targetImpl.getComponent<ConversationComponent>(ComponentType.Conversation);
    // Only start conversation if target is not already talking
    if (!targetConversation || isInConversation(targetConversation)) return null;
    // Start conversation for both agents
    entity.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) =>
      startConversation(current, targetAgent.id, world.tick)
    );
    targetImpl.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) =>
      startConversation(current, entity.id, world.tick)
    );
    // Switch both to talk behavior
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'talk',
      behaviorState: { partnerId: targetAgent.id },
    }));
    targetImpl.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'talk',
      behaviorState: { partnerId: entity.id },
    }));
    // Emit conversation started event
    world.eventBus.emit({
      type: 'conversation:started',
      source: entity.id,
      data: {
        participants: [entity.id, targetAgent.id],
        initiator: entity.id,
        agent1: entity.id,
        agent2: targetAgent.id,
      },
    });
    return { changed: true, behavior: 'talk', behaviorState: { partnerId: targetAgent.id } };
  }
  /**
   * Check if agent should gather seeds from nearby plants.
   *
   * Performance: Uses chunk-based spatial lookup instead of querying all plants.
   */
  private checkSeedGathering(
    entity: EntityImpl,
    world: World
  ): ScriptedDecisionResult | null {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return null;

    const CHUNK_SIZE = 32;
    const chunkX = Math.floor(position.x / CHUNK_SIZE);
    const chunkY = Math.floor(position.y / CHUNK_SIZE);
    const chunkRange = Math.ceil(DETECTION_RANGE / CHUNK_SIZE);

    const plantsWithSeeds: Entity[] = [];
    const validStages = ['mature', 'seeding', 'senescence'];

    // Check entities in nearby chunks
    for (let dx = -chunkRange; dx <= chunkRange; dx++) {
      for (let dy = -chunkRange; dy <= chunkRange; dy++) {
        const nearbyEntityIds = world.getEntitiesInChunk(chunkX + dx, chunkY + dy);

        for (const entityId of nearbyEntityIds) {
          const nearbyEntity = world.entities.get(entityId);
          if (!nearbyEntity) continue;

          const plantImpl = nearbyEntity as EntityImpl;
          const plant = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);
          if (!plant) continue;

          // Check if plant has seeds and is at a valid stage
          if (!validStages.includes(plant.stage)) continue;
          if (plant.seedsProduced <= 0) continue;

          const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);
          if (!plantPos) continue;

          // Manhattan distance early exit
          const manhattanDist = Math.abs(plantPos.x - position.x) + Math.abs(plantPos.y - position.y);
          if (manhattanDist > DETECTION_RANGE * 1.5) continue;

          const distance = this.distance(position, plantPos);
          if (distance <= DETECTION_RANGE) {
            plantsWithSeeds.push(nearbyEntity);
          }
        }
      }
    }

    if (plantsWithSeeds.length === 0) return null;
    // Choose a random plant to gather from
    const targetPlant = plantsWithSeeds[Math.floor(Math.random() * plantsWithSeeds.length)]!;
    const targetPlantComp = (targetPlant as EntityImpl).getComponent<PlantComponent>(ComponentType.Plant);
    // Emit gather_seeds action request
    const posComp = (targetPlant as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);
    world.eventBus.emit({
      type: 'action:gather_seeds',
      source: entity.id,
      data: {
        actionId: `gather_seeds_${Date.now()}`,
        actorId: entity.id,
        agentId: entity.id,
        plantId: targetPlant.id,
        speciesId: targetPlantComp?.speciesId || 'unknown',
        seedsGathered: 0,
        position: posComp ? { x: posComp.x, y: posComp.y } : { x: 0, y: 0 },
      },
    });
    // Switch to gather_seeds behavior
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'gather_seeds',
      behaviorState: {
        targetPlantId: targetPlant.id,
        resourceType: 'seeds',
      },
    }));
    return {
      changed: true,
      behavior: 'gather_seeds',
      behaviorState: { targetPlantId: targetPlant.id, resourceType: 'seeds' },
    };
  }
  /**
   * Check if agent should end conversation.
   */
  private checkEndConversation(
    entity: EntityImpl,
    world: World
  ): ScriptedDecisionResult | null {
    const conversation = entity.getComponent<ConversationComponent>(ComponentType.Conversation);
    if (!conversation?.partnerId) return null;
    const partner = world.getEntity(conversation.partnerId);
    if (!partner) return null;
    const partnerImpl = partner as EntityImpl;
    // End conversation for both
    entity.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) => ({
      ...current,
      isActive: false,
      partnerId: null,
    }));
    partnerImpl.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) => ({
      ...current,
      isActive: false,
      partnerId: null,
    }));
    // Switch both back to wandering
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'wander',
      behaviorState: {},
    }));
    partnerImpl.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'wander',
      behaviorState: {},
    }));
    return { changed: true, behavior: 'wander', behaviorState: {} };
  }
  /**
   * Process planned builds - gather resources or execute build when ready.
   */
  private processPlannedBuilds(
    entity: EntityImpl,
    _world: World,
    plannedBuilds: PlannedBuild[],
    inventory: InventoryComponent
  ): ScriptedDecisionResult | null {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return null;
    // Sort by priority (high > normal > low)
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const sortedBuilds = [...plannedBuilds].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
    // Process highest priority build
    const build = sortedBuilds[0];
    if (!build) return null;
    const costs = BUILDING_COSTS[build.buildingType];
    if (!costs) {
      // Unknown building type - remove from queue
      this.removePlannedBuild(entity, build);
      return null;
    }
    // Calculate what resources we're missing
    const missing: Record<string, number> = {};
    for (const [resource, needed] of Object.entries(costs)) {
      const have = inventory.slots
        .filter((s) => s.itemId === resource)
        .reduce((sum, s) => sum + s.quantity, 0);
      if (have < needed) {
        missing[resource] = needed - have;
      }
    }
    // If we have all resources, check if we're near the build location
    if (Object.keys(missing).length === 0) {
      const distToBuild = this.distance(position, build.position);
      if (distToBuild <= PLANNED_BUILD_REACH) {
        // Near enough - start building!
        this.removePlannedBuild(entity, build);
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behavior: 'build',
          behaviorState: {
            buildingType: build.buildingType,
            targetPosition: build.position,
          },
        }));
        return {
          changed: true,
          behavior: 'build',
          behaviorState: {
            buildingType: build.buildingType,
            targetPosition: build.position,
          },
        };
      } else {
        // Move toward build location
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behavior: 'navigate',
          behaviorState: {
            targetPosition: build.position,
            reason: `Moving to build ${build.buildingType}`,
          },
        }));
        return {
          changed: true,
          behavior: 'navigate',
          behaviorState: { targetPosition: build.position },
        };
      }
    }
    // Missing resources - gather the most needed one
    // Prioritize by how much we're missing (gather what we need most)
    const mostNeeded = Object.entries(missing).sort((a, b) => b[1] - a[1])[0];
    if (mostNeeded) {
      const [resourceType] = mostNeeded;
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'gather',
        behaviorState: {
          resourceType,
          forBuild: build.buildingType,
        },
      }));
      return {
        changed: true,
        behavior: 'gather',
        behaviorState: { resourceType, forBuild: build.buildingType },
      };
    }
    return null;
  }
  /**
   * Remove a completed/invalid planned build from the agent.
   */
  private removePlannedBuild(entity: EntityImpl, build: PlannedBuild): void {
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      plannedBuilds: (current.plannedBuilds || []).filter(
        (b) =>
          b.buildingType !== build.buildingType ||
          b.position.x !== build.position.x ||
          b.position.y !== build.position.y
      ),
    }));
  }
  /**
   * Select behavior based on strategic priorities using highest score selection.
   */
  private selectPriorityBasedBehavior(
    entity: EntityImpl,
    world: World,
    priorities: StrategicPriorities,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): ScriptedDecisionResult | null {
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    // Build candidate behaviors based on what's possible/available
    const candidates: BehaviorCandidate[] = [];
    // GATHERING: wood, stone, food - only gather what we actually need
    if (priorities.gathering && inventory && position) {
      const hasWood = inventory.slots.some((s) => s.itemId === 'wood' && s.quantity >= 10);
      const hasStone = inventory.slots.some((s) => s.itemId === 'stone' && s.quantity >= 10);
      const hasFood = inventory.slots.some((s) => (s.itemId === 'food' || s.itemId === 'berry') && s.quantity >= 5);
      // Only look for resources we need
      const nearest = this.findNearestResources(world, position, hasFood, hasWood, hasStone);
      if (nearest.wood && !hasWood) {
        candidates.push({
          behavior: 'gather',
          behaviorState: { resourceType: 'wood' },
          category: 'gathering',
          baseWeight: 0.8,
        });
      }
      if (nearest.stone && !hasStone) {
        candidates.push({
          behavior: 'gather',
          behaviorState: { resourceType: 'stone' },
          category: 'gathering',
          baseWeight: 0.6,
        });
      }
      if (nearest.food && !hasFood) {
        candidates.push({
          behavior: 'seek_food',
          behaviorState: {},
          category: 'gathering',
          baseWeight: 1.0, // Food is high value when needed
        });
      }
    }
    // BUILDING: determine what village needs, then gather or build
    if (priorities.building && inventory && position) {
      const storageStats = calculateStorageStats(world);
      const suggestion = suggestBuildingFromStorage(storageStats, world);
      if (suggestion) {
        const weightByPriority = { high: 1.0, medium: 0.7, low: 0.4 };
        const baseWeight = weightByPriority[suggestion.priority];
        // Check what resources we need for this building
        const costs = BUILDING_COSTS[suggestion.buildingType];
        if (costs) {
          // Calculate what we're missing
          const missing: Record<string, number> = {};
          for (const [resource, needed] of Object.entries(costs)) {
            const have = inventory.slots
              .filter((s) => s.itemId === resource)
              .reduce((sum, s) => sum + s.quantity, 0);
            if (have < needed) {
              missing[resource] = needed - have;
            }
          }
          if (Object.keys(missing).length > 0) {
            // Missing resources - add gather candidates for each missing resource
            // These use ComponentType.Building category so building priority applies
            for (const [resourceType, amountNeeded] of Object.entries(missing)) {
              // Check if this resource is available nearby
              const resourcesNearby = world.query().with(ComponentType.Resource).with(ComponentType.Position).executeEntities();
              const hasNearbyResource = resourcesNearby.some((r) => {
                const rc = r.components.get(ComponentType.Resource) as ResourceComponent | undefined;
                const rp = r.components.get(ComponentType.Position) as PositionComponent | undefined;
                if (!rc || !rp || !rc.harvestable || rc.amount <= 0) return false;
                if (rc.resourceType !== resourceType) return false;
                const dist = this.distance(position, rp);
                return dist <= DETECTION_RANGE;
              });
              if (hasNearbyResource) {
                candidates.push({
                  behavior: 'gather',
                  behaviorState: {
                    resourceType,
                    targetAmount: amountNeeded,
                    forBuild: suggestion.buildingType,
                  },
                  category: ComponentType.Building, // Use building priority for build-related gathering
                  baseWeight: baseWeight * 0.9, // Slightly lower than building itself
                });
              }
            }
          } else {
            // Have all resources - add build candidate
            candidates.push({
              behavior: 'build',
              behaviorState: {
                buildingType: suggestion.buildingType,
                reason: suggestion.reason,
              },
              category: ComponentType.Building,
              baseWeight,
            });
          }
        }
      }
    }
    // DEPOSIT: offload inventory when it's getting heavy
    // Heavy inventory burns calories faster, so deposit early
    // But don't deposit if storage is critically full (would waste items)
    if (inventory) {
      const weightPct = inventory.currentWeight / inventory.maxWeight;
      const hasItems = inventory.slots.some((s) => s.itemId && s.quantity > 0);
      if (hasItems && weightPct >= 0.5) {
        // Check if storage has room (use cached stats if available, otherwise calculate)
        const stats = calculateStorageStats(world);
        const hasStorageRoom = !stats.isFull && stats.freeSlots > 0;
        if (hasStorageRoom) {
          // Weight determines urgency: 50% = moderate, 75%+ = high priority
          const depositWeight = weightPct >= 0.75 ? 1.0 : 0.7;
          candidates.push({
            behavior: 'deposit_items',
            behaviorState: {},
            category: 'gathering', // Part of resource management
            baseWeight: depositWeight,
          });
        } else if (stats.isFull) {
          // Storage is full - prioritize building more storage instead
          // This is handled by the BUILDING section above via suggestBuildingFromStorage
        }
      }
    }
    // FARMING: Context-aware farming decisions
    if (priorities.farming && inventory) {
      // Calculate farming context and utilities
      const farmingContext = calculateFarmingContext(entity, world);
      const farmingUtilities = calculateFarmingUtilities(farmingContext);
      // Only add farming candidates if there's meaningful work to do
      if (shouldFarm(farmingUtilities)) {
        // Till: prepare soil for planting
        if (farmingUtilities.till > 0) {
          candidates.push({
            behavior: 'till',
            behaviorState: {},
            category: 'farming',
            baseWeight: farmingUtilities.till,
          });
        }
        // Plant: plant seeds in tilled soil
        if (farmingUtilities.plant > 0) {
          candidates.push({
            behavior: ComponentType.Plant,
            behaviorState: {},
            category: 'farming',
            baseWeight: farmingUtilities.plant,
          });
        }
        // Water: water dry plants
        if (farmingUtilities.water > 0) {
          candidates.push({
            behavior: 'water',
            behaviorState: {},
            category: 'farming',
            baseWeight: farmingUtilities.water,
          });
        }
        // Harvest: collect from mature plants
        if (farmingUtilities.harvest > 0 && !farmingContext.inventoryFull) {
          candidates.push({
            behavior: 'gather', // Uses gather behavior for harvesting
            behaviorState: { resourceType: 'harvest' },
            category: 'farming',
            baseWeight: farmingUtilities.harvest,
          });
        }
        // Gather seeds: collect seeds from plants
        if (farmingUtilities.gather_seeds > 0 && !farmingContext.inventoryFull) {
          candidates.push({
            behavior: 'gather_seeds',
            behaviorState: { resourceType: 'seeds' },
            category: 'farming',
            baseWeight: farmingUtilities.gather_seeds,
          });
        }
      }
    }
    // SOCIAL: talk, help
    if (priorities.social) {
      const nearbyAgents = getNearbyAgents(entity, world, 15);
      if (nearbyAgents.length > 0) {
        const targetAgent = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
        if (targetAgent) {
          candidates.push({
            behavior: 'talk',
            behaviorState: { partnerId: targetAgent.id },
            category: 'social',
            baseWeight: 0.7,
          });
          candidates.push({
            behavior: 'follow_agent',
            behaviorState: { targetId: targetAgent.id },
            category: 'social',
            baseWeight: 0.5,
          });
        }
      }
    }
    // EXPLORATION: wander, explore
    if (priorities.exploration) {
      candidates.push({
        behavior: 'explore',
        behaviorState: {},
        category: 'exploration',
        baseWeight: 0.6,
      });
      candidates.push({
        behavior: 'wander',
        behaviorState: {},
        category: 'exploration',
        baseWeight: 0.3,
      });
    }
    // REST: idle, rest
    if (priorities.rest) {
      candidates.push({
        behavior: 'rest',
        behaviorState: {},
        category: 'rest',
        baseWeight: 0.5,
      });
      candidates.push({
        behavior: 'idle',
        behaviorState: {},
        category: 'rest',
        baseWeight: 0.3,
      });
    }

    // MAGIC: spell casting for magic users
    if (priorities.magic && priorities.magic > 0) {
      const magic = entity.getComponent<MagicComponent>(ComponentType.Magic);
      if (magic && magic.magicUser && magic.knownSpells.length > 0) {
        // Get spell suggestions based on current context
        const spellSuggestions = suggestSpells(entity, world, { maxSuggestions: 3, minUtility: 0.3 });

        for (const suggestion of spellSuggestions) {
          candidates.push({
            behavior: 'cast_spell',
            behaviorState: {
              spellId: suggestion.spellId,
              targetId: suggestion.targetId,
              reason: suggestion.reason,
            },
            category: 'magic',
            baseWeight: suggestion.utility,
          });
        }
      }
    }

    if (candidates.length === 0) {
      return null; // No valid candidates
    }
    // Calculate final scores: baseWeight * priority
    const scoredCandidates = candidates.map((c) => ({
      ...c,
      score: c.baseWeight * (priorities[c.category] || 0.1),
    }));
    // Sort by score descending and pick highest
    scoredCandidates.sort((a, b) => b.score - a.score);
    const best = scoredCandidates[0];
    if (!best || best.score <= 0) {
      return null;
    }
    // Execute highest priority behavior
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: best.behavior,
      behaviorState: best.behaviorState,
    }));
    return {
      changed: true,
      behavior: best.behavior,
      behaviorState: best.behaviorState,
    };
  }
  /**
   * Calculate distance between two positions.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
// ============================================================================
// Standalone functions for simpler usage
// ============================================================================
const processor = new ScriptedDecisionProcessor();
/**
 * Process scripted decision for an entity.
 */
export function processScriptedDecision(
  entity: EntityImpl,
  world: World,
  getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
): ScriptedDecisionResult {
  return processor.process(entity, world, getNearbyAgents);
}
