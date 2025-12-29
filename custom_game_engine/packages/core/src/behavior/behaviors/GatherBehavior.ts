/**
 * GatherBehavior - Resource and seed gathering
 *
 * Agent finds and gathers resources (wood, stone, etc.) or seeds from plants.
 * Handles:
 * - Resource node harvesting
 * - Seed gathering from mature plants
 * - Energy-based work speed penalties
 * - Inventory full -> deposit items
 * - Return to build when gathering for construction
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { ResourceComponent } from '../../components/ResourceComponent.js';
import type { MemoryComponent } from '../../components/MemoryComponent.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type { PlantComponent } from '../../components/PlantComponent.js';
import type { BuildingType } from '../../components/BuildingComponent.js';
import type { ResourceCost } from '../../buildings/BuildingBlueprintRegistry.js';
import type { GatheringStatsComponent } from '../../components/GatheringStatsComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { addToInventory, addToInventoryWithQuality } from '../../components/InventoryComponent.js';
import { addMemory } from '../../components/MemoryComponent.js';
import { recordGathered } from '../../components/GatheringStatsComponent.js';
import { WanderBehavior } from './WanderBehavior.js';
import { createSeedItemId, calculateGatheringQuality } from '../../items/index.js';
import type { SkillsComponent } from '../../components/SkillsComponent.js';
import { addSkillXP } from '../../components/SkillsComponent.js';

/** Maximum distance agent will travel to gather resources */
const MAX_GATHER_RANGE = 50;

/** Prefer resources within this radius of home (0, 0) */
const HOME_RADIUS = 15;

/** Distance at which agent can harvest resources */
const HARVEST_DISTANCE = 1.5;

/**
 * Get the current game day from the world's time entity.
 */
function getCurrentDay(world: World): number {
  const timeEntities = world.query().with('time').executeEntities();
  if (timeEntities.length > 0) {
    const timeEntity = timeEntities[0] as EntityImpl;
    const timeComp = timeEntity.getComponent('time') as { day?: number } | undefined;
    return timeComp?.day ?? 0;
  }
  return 0;
}

/**
 * GatherBehavior - Find and harvest resources or seeds
 */
export class GatherBehavior extends BaseBehavior {
  readonly name = 'gather' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const inventory = entity.getComponent<InventoryComponent>('inventory');
    const agent = entity.getComponent<AgentComponent>('agent')!;

    // Disable steering system so it doesn't override our gather movement
    this.disableSteering(entity);

    if (!inventory) {
      // No inventory component, can't gather - execute wander logic without changing behavior
      const wanderBehavior = new WanderBehavior();
      wanderBehavior.execute(entity, world);
      return;
    }

    // Determine preferred resource type from behaviorState
    const preferredType = agent.behaviorState?.resourceType as string | undefined;

    // Find target (resource or plant with seeds)
    const target = this.findGatherTarget(world, position, preferredType, inventory);

    if (!target) {
      // No resources or seed-producing plants found, execute wander logic without changing behavior
      const wanderBehavior = new WanderBehavior();
      wanderBehavior.execute(entity, world);
      return;
    }

    const targetPos = target.position;

    // Move toward target (with arrival slowdown) and check distance
    const distanceToTarget = this.moveToward(entity, targetPos, { arrivalDistance: HARVEST_DISTANCE });

    // Check if adjacent (within harvest distance)
    if (distanceToTarget <= HARVEST_DISTANCE) {
      this.stopAllMovement(entity);

      const workSpeedMultiplier = this.calculateWorkSpeed(entity);

      if (workSpeedMultiplier === 0) {
        // Too exhausted to work
        this.switchTo(entity, 'idle', {});
        return { complete: false, reason: 'Too exhausted to work' };
      }

      if (target.type === 'resource') {
        this.harvestResource(entity, target.entity, world, inventory, agent, workSpeedMultiplier);
      } else {
        this.gatherSeeds(entity, target.entity, world, inventory, targetPos, workSpeedMultiplier);
      }
    }
  }

  private findGatherTarget(
    world: World,
    position: PositionComponent,
    preferredType: string | undefined,
    _inventory: InventoryComponent
  ): { type: 'resource' | 'plant'; entity: Entity; position: { x: number; y: number }; distance: number } | null {
    const isSeekingSeeds = preferredType === 'seeds';

    // If explicitly seeking seeds, only look for plants
    if (isSeekingSeeds) {
      const plantTarget = this.findNearestPlantWithSeeds(world, position);
      if (plantTarget) {
        return { type: 'plant', entity: plantTarget.entity, position: plantTarget.position, distance: plantTarget.distance };
      }
      return null;
    }

    // Otherwise, look for the specified resource type
    const resourceTarget = this.findNearestResource(world, position, preferredType);

    if (resourceTarget) {
      return { type: 'resource', entity: resourceTarget.entity, position: resourceTarget.position, distance: resourceTarget.distance };
    }

    // Fallback: if no resources found and no specific type requested, try seeds
    if (!preferredType) {
      const plantTarget = this.findNearestPlantWithSeeds(world, position);
      if (plantTarget) {
        return { type: 'plant', entity: plantTarget.entity, position: plantTarget.position, distance: plantTarget.distance };
      }
    }

    return null;
  }

  private findNearestResource(
    world: World,
    position: PositionComponent,
    preferredType: string | undefined
  ): { entity: Entity; position: { x: number; y: number }; distance: number } | null {
    const resources = world
      .query()
      .with('resource')
      .with('position')
      .executeEntities();

    let bestScore = Infinity;
    let bestResource: Entity | null = null;
    let bestPosition: { x: number; y: number } | null = null;
    let bestDistance = Infinity;

    for (const resource of resources) {
      const resourceImpl = resource as EntityImpl;
      const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource')!;
      const resourcePos = resourceImpl.getComponent<PositionComponent>('position')!;

      // Skip non-harvestable resources
      if (!resourceComp.harvestable) continue;
      if (resourceComp.amount <= 0) continue;

      // If preferred type specified, only consider that type
      if (preferredType && resourceComp.resourceType !== preferredType) continue;

      // Distance from agent to resource
      const distanceToAgent = this.distance(position, resourcePos);

      // Only consider resources within max gather range
      if (distanceToAgent > MAX_GATHER_RANGE) continue;

      // Distance from resource to home (0, 0)
      const distanceToHome = Math.sqrt(resourcePos.x * resourcePos.x + resourcePos.y * resourcePos.y);

      // Scoring: prefer resources near home AND near agent
      let score = distanceToAgent;
      if (distanceToHome > HOME_RADIUS) {
        // Penalize resources far from home (add 2x the excess distance)
        score += (distanceToHome - HOME_RADIUS) * 2.0;
      }

      if (score < bestScore) {
        bestScore = score;
        bestResource = resource;
        bestPosition = { x: resourcePos.x, y: resourcePos.y };
        bestDistance = distanceToAgent;
      }
    }

    return bestResource ? { entity: bestResource, position: bestPosition!, distance: bestDistance } : null;
  }

  private findNearestPlantWithSeeds(
    world: World,
    position: PositionComponent
  ): { entity: Entity; position: { x: number; y: number }; distance: number } | null {
    const plants = world
      .query()
      .with('plant')
      .with('position')
      .executeEntities();

    let nearestPlant: Entity | null = null;
    let nearestPos: { x: number; y: number } | null = null;
    let nearestDistance = Infinity;

    for (const plant of plants) {
      const plantImpl = plant as EntityImpl;
      const plantComp = plantImpl.getComponent<PlantComponent>('plant');
      const plantPos = plantImpl.getComponent<PositionComponent>('position')!;

      if (!plantComp) continue;

      // Check if plant has seeds available for gathering
      const validStages = ['mature', 'seeding', 'senescence'];
      const hasSeeds = plantComp.seedsProduced > 0;
      const isValidStage = validStages.includes(plantComp.stage);

      if (hasSeeds && isValidStage) {
        const distance = this.distance(position, plantPos);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPlant = plant;
          nearestPos = { x: plantPos.x, y: plantPos.y };
        }
      }
    }

    return nearestPlant ? { entity: nearestPlant, position: nearestPos!, distance: nearestDistance } : null;
  }

  private calculateWorkSpeed(entity: EntityImpl): number {
    const needs = entity.getComponent<NeedsComponent>('needs');

    if (!needs) {
      return 1.0; // No needs = full speed
    }

    const energy = needs.energy;

    // Energy thresholds and penalties per work order:
    // 100-70: No penalty
    // 70-50: -10% work speed
    // 50-30: -25% work speed
    // 30-10: -50% work speed
    // 10-0: Cannot work

    if (energy < 10) {
      return 0; // Cannot work
    } else if (energy < 30) {
      return 0.5; // -50% work speed
    } else if (energy < 50) {
      return 0.75; // -25% work speed
    } else if (energy < 70) {
      return 0.9; // -10% work speed
    }

    return 1.0; // Full speed
  }

  private harvestResource(
    entity: EntityImpl,
    resourceEntity: Entity,
    world: World,
    inventory: InventoryComponent,
    agent: AgentComponent,
    workSpeedMultiplier: number
  ): void {
    const resourceImpl = resourceEntity as EntityImpl;
    const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource')!;
    const resourcePos = resourceImpl.getComponent<PositionComponent>('position');
    const memory = entity.getComponent<MemoryComponent>('memory');

    const baseHarvestAmount = 1;
    // REQUIREMENT: Can't gather less than 1 whole fruit/resource
    // First check if resource has at least 1 whole unit available
    if (resourceComp.amount < 1) {
      // Resource doesn't have a whole unit to gather yet
      return;
    }

    // Calculate harvest amount - use floor of resource amount to ensure whole units
    const harvestAmount = Math.min(
      Math.floor(baseHarvestAmount * workSpeedMultiplier),
      Math.floor(resourceComp.amount) // Only gather whole units
    );

    // If work speed penalty reduces harvest to 0, or less than 1 whole unit, can't gather
    if (harvestAmount < 1) {
      this.stopAllMovement(entity);
      return;
    }

    // Update resource
    resourceImpl.updateComponent<ResourceComponent>('resource', (current) => ({
      ...current,
      amount: Math.max(0, current.amount - harvestAmount),
    }));

    // Calculate quality based on gathering skill (Phase 10)
    const skillsComp = entity.getComponent<SkillsComponent>('skills');
    const gatheringLevel = skillsComp?.levels.gathering ?? 0;
    const gatherQuality = calculateGatheringQuality(gatheringLevel, resourceComp.resourceType);

    // Add to inventory WITH QUALITY
    try {
      const result = addToInventoryWithQuality(inventory, resourceComp.resourceType, harvestAmount, gatherQuality);
      entity.updateComponent<InventoryComponent>('inventory', () => result.inventory);

      // Record gathering stats
      const gatheringStats = entity.getComponent<GatheringStatsComponent>('gathering_stats');
      if (gatheringStats) {
        const currentDay = getCurrentDay(world);
        recordGathered(gatheringStats, resourceComp.resourceType, result.amountAdded, currentDay);
        entity.updateComponent<GatheringStatsComponent>('gathering_stats', () => gatheringStats);
      }

      // Award gathering XP (5 base XP per resource gathered)
      if (skillsComp) {
        const baseXP = 5 * result.amountAdded;
        const oldLevel = skillsComp.levels.gathering;
        const xpResult = addSkillXP(skillsComp, 'gathering', baseXP);
        entity.updateComponent<SkillsComponent>('skills', () => xpResult.component);

        // Emit skill XP event for metrics tracking
        world.eventBus.emit({
          type: 'skill:xp_gain',
          source: entity.id,
          data: {
            agentId: entity.id,
            skillId: 'gathering',
            amount: baseXP,
            source: 'gathering',
          },
        });

        // Emit level up event if applicable
        if (xpResult.leveledUp) {
          world.eventBus.emit({
            type: 'skill:level_up',
            source: entity.id,
            data: {
              agentId: entity.id,
              skillId: 'gathering',
              oldLevel,
              newLevel: xpResult.newLevel,
            },
          });
        }
      }

      // Emit resource gathered event BEFORE any early returns
      // This ensures metrics are tracked even when inventory fills or building in progress
      world.eventBus.emit({
        type: 'resource:gathered',
        source: entity.id,
        data: {
          agentId: entity.id,
          resourceType: resourceComp.resourceType,
          amount: result.amountAdded,
          position: resourcePos ? { x: resourcePos.x, y: resourcePos.y } : { x: 0, y: 0 },
          sourceEntityId: resourceEntity.id,
        },
      });

      // Check if inventory is now full
      if (result.inventory.currentWeight >= result.inventory.maxWeight) {
        this.handleInventoryFull(entity, world, agent);
        return;
      }

      // Check if we're gathering for a building
      if (agent.behaviorState?.returnToBuild) {
        this.checkBuildProgress(entity, world, result.inventory, agent);
        return;
      }

      // Reinforce memory of this resource location
      if (memory && resourcePos) {
        const updatedMemory = addMemory(
          memory,
          {
            type: 'resource_location',
            x: resourcePos.x,
            y: resourcePos.y,
            entityId: resourceEntity.id,
            metadata: { resourceType: resourceComp.resourceType },
          },
          world.tick,
          100
        );
        entity.updateComponent<MemoryComponent>('memory', () => updatedMemory);
      }

      // Check if resource depleted
      if (resourceComp.amount - harvestAmount <= 0) {
        world.eventBus.emit({
          type: 'resource:depleted',
          source: resourceEntity.id,
          data: {
            resourceId: resourceEntity.id,
            resourceType: resourceComp.resourceType,
            agentId: entity.id,
          },
        });
      }
    } catch (error) {
      // Inventory full or weight limit exceeded
      this.handleInventoryFull(entity, world, agent);
    }
  }

  private gatherSeeds(
    entity: EntityImpl,
    plantEntity: Entity,
    world: World,
    inventory: InventoryComponent,
    targetPos: { x: number; y: number },
    workSpeedMultiplier: number
  ): void {
    const plantImpl = plantEntity as EntityImpl;
    const plantComp = plantImpl.getComponent<PlantComponent>('plant');

    if (!plantComp) {
      return;
    }

    // Calculate seed yield based on plant health and agent skill
    // Formula from spec: baseSeedCount * (health/100) * stageMod * skillMod
    const baseSeedCount = 5;
    const healthMod = plantComp.health / 100;
    const stageMod = plantComp.stage === 'seeding' ? 1.5 : 1.0;
    const farmingSkill = 50; // Default skill (TODO: get from agent skills when implemented)
    const skillMod = 0.5 + (farmingSkill / 100);

    const seedYield = Math.floor(baseSeedCount * healthMod * stageMod * skillMod * workSpeedMultiplier);

    // REQUIREMENT: Can't gather less than 1 whole seed/fruit
    // If yield calculation results in less than 1, don't gather at all
    if (seedYield < 1) {
      return;
    }

    const seedsToGather = Math.min(seedYield, plantComp.seedsProduced);

    // Must have at least 1 seed available to gather
    if (seedsToGather < 1) {
      return;
    }

    // Create seed item ID for inventory using SeedItemFactory
    const seedItemId = createSeedItemId(plantComp.speciesId);

    try {
      const result = addToInventory(inventory, seedItemId, seedsToGather);
      entity.updateComponent<InventoryComponent>('inventory', () => result.inventory);

      // Record gathering stats for seeds
      const gatheringStats = entity.getComponent<GatheringStatsComponent>('gathering_stats');
      if (gatheringStats) {
        const currentDay = getCurrentDay(world);
        recordGathered(gatheringStats, seedItemId, result.amountAdded, currentDay);
        entity.updateComponent<GatheringStatsComponent>('gathering_stats', () => gatheringStats);
      }


      // Update plant - reduce seedsProduced
      plantImpl.updateComponent<PlantComponent>('plant', (current) => {
        const updated = Object.create(Object.getPrototypeOf(current));
        Object.assign(updated, current);
        updated.seedsProduced = Math.max(0, current.seedsProduced - result.amountAdded);
        return updated;
      });

      // Emit seed:gathered event
      world.eventBus.emit({
        type: 'seed:gathered',
        source: entity.id,
        data: {
          agentId: entity.id,
          plantId: plantEntity.id,
          speciesId: plantComp.speciesId,
          seedCount: result.amountAdded,
          sourceType: 'wild' as const,
          position: targetPos,
        },
      });

      // Check if inventory is now full
      if (result.inventory.currentWeight >= result.inventory.maxWeight) {
        const agent = entity.getComponent<AgentComponent>('agent')!;
        this.handleInventoryFull(entity, world, agent);
      }
    } catch (error) {
      // Inventory full
      const agent = entity.getComponent<AgentComponent>('agent')!;
      this.handleInventoryFull(entity, world, agent);
    }
  }

  private handleInventoryFull(entity: EntityImpl, world: World, _agent: AgentComponent): void {
    world.eventBus.emit({
      type: 'inventory:full',
      source: entity.id,
      data: {
        entityId: entity.id,
        agentId: entity.id,
      },
    });

    // Switch to deposit_items behavior, saving previous behavior to return to
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behavior: 'deposit_items',
      behaviorState: {
        previousBehavior: 'gather',
        previousState: current.behaviorState,
      },
      behaviorCompleted: true,
    }));
  }

  private checkBuildProgress(
    entity: EntityImpl,
    world: World,
    inventory: InventoryComponent,
    agent: AgentComponent
  ): void {
    const buildingType = agent.behaviorState.returnToBuild as BuildingType;
    const blueprint = (world as any).buildingRegistry?.tryGet(buildingType);

    if (!blueprint) {
      return;
    }

    const stillMissing = this.getMissingResources(inventory, blueprint.resourceCost);

    if (stillMissing.length === 0) {
      // We have everything! Emit goal achieved event for memory
      world.eventBus.emit({
        type: 'behavior:goal_achieved',
        source: 'gather-behavior',
        data: {
          agentId: entity.id,
          behavior: 'gather',
          goalType: 'construction_materials',
          summary: `Gathered all materials needed to build ${buildingType}`,
        },
      });

      // Switch to build
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'build',
        behaviorState: { buildingType },
      }));
    } else if (stillMissing.length > 0) {
      // Still missing something, keep gathering
      const nextMissing = stillMissing[0]!;

      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'gather',
        behaviorState: {
          resourceType: nextMissing.resourceId,
          targetAmount: nextMissing.amountRequired,
          returnToBuild: buildingType,
        },
      }));
    }
  }

  private getMissingResources(
    inventory: InventoryComponent,
    costs: ResourceCost[]
  ): ResourceCost[] {
    const missing: ResourceCost[] = [];

    for (const cost of costs) {
      const available = inventory.slots
        .filter((s: any) => s.itemId === cost.resourceId)
        .reduce((sum: number, s: any) => sum + s.quantity, 0);

      if (available < cost.amountRequired) {
        missing.push({
          resourceId: cost.resourceId,
          amountRequired: cost.amountRequired - available,
        });
      }
    }

    return missing;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function gatherBehavior(entity: EntityImpl, world: World): void {
  const behavior = new GatherBehavior();
  behavior.execute(entity, world);
}
