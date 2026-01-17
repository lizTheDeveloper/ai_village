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
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type { PlantComponent } from '../../components/PlantComponent.js';
import type { BuildingType } from '../../components/BuildingComponent.js';
import type { ResourceCost } from '../../buildings/BuildingBlueprintRegistry.js';
import type { GatheringStatsComponent } from '../../components/GatheringStatsComponent.js';
import type { VoxelResourceComponent } from '../../components/VoxelResourceComponent.js';
import type { EquipmentSlotsComponent } from '../../components/EquipmentSlotsComponent.js';
import { getEquippedItem } from '../../components/EquipmentSlotsComponent.js';
import { reduceStabilityFromHarvest, getMaterialHardness } from '../../systems/TreeFellingSystem.js';
import { getDurabilitySystem } from '../../systems/DurabilitySystem.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { addToInventoryWithQuality } from '../../components/InventoryComponent.js';
import { SpatialMemoryComponent, addSpatialMemory } from '../../components/SpatialMemoryComponent.js';
import { recordGathered } from '../../components/GatheringStatsComponent.js';
import { createSeedItemId, calculateGatheringQuality } from '../../items/index.js';
import type { SkillsComponent } from '../../components/SkillsComponent.js';
import { addSkillXP } from '../../components/SkillsComponent.js';
import { ComponentType } from '../../types/ComponentType.js';
import { isEdibleSpecies } from '../../services/TargetingAPI.js';
import {
  GATHER_MAX_RANGE,
  HOME_RADIUS,
  HARVEST_DISTANCE,
  ENERGY_MODERATE,
  ENERGY_LOW,
  ENERGY_HIGH,
  ENERGY_CRITICAL,
  WORK_SPEED_LOW,
  WORK_SPEED_CRITICAL,
  GATHER_RESOURCE_BASE_TICKS,
  GATHER_SPEED_PER_SKILL_LEVEL,
} from '../../constants/index.js';

// Chunk spatial query injection for efficient nearby entity lookups
let chunkSpatialQuery: any | null = null;

export function injectChunkSpatialQueryToGather(spatialQuery: any): void {
  chunkSpatialQuery = spatialQuery;
  console.log('[GatherBehavior] ChunkSpatialQuery injected for efficient resource/plant lookups');
}

/**
 * Food types that should be gathered from plants (fruit) rather than resource entities.
 * These map to plant species that produce edible fruit.
 */
const PLANT_FRUIT_TYPES = new Set(['berry', 'berries', 'fruit', 'apple', 'carrot', 'wheat']);


/**
 * Get the current game day from the world's time entity.
 */
function getCurrentDay(world: World): number {
  return world.gameTime.day;
}

/**
 * State stored in agent.behaviorState for gathering progress
 */
interface GatherBehaviorState {
  /** Preferred resource type to gather */
  resourceType?: string;
  /** Target amount needed (for build tasks) */
  targetAmount?: number;
  /** Building to return to after gathering */
  returnToBuild?: string;
  /** Entity ID of resource being gathered */
  gatherTargetId?: string;
  /** Tick when gathering started */
  gatherStartTick?: number;
  /** Required ticks to complete gathering */
  gatherDurationTicks?: number;
  /** Index signature for compatibility with Record<string, unknown> */
  [key: string]: unknown;
}

/**
 * Calculate gathering duration in ticks based on skill and difficulty.
 *
 * Formula:
 *   duration = baseTicks * difficulty / gatherSpeed
 *   gatherSpeed = 1.0 + (skillLevel * 0.2)
 *
 * Examples:
 *   - Skill 0, difficulty 1.0: 20 / 1.0 = 20 ticks (1 second)
 *   - Skill 5, difficulty 1.0: 20 / 2.0 = 10 ticks (0.5 seconds)
 *   - Skill 0, difficulty 10.0: 200 / 1.0 = 200 ticks (10 seconds)
 *   - Skill 5, difficulty 10.0: 200 / 2.0 = 100 ticks (5 seconds)
 */
function calculateGatherDuration(gatheringSkillLevel: number, gatherDifficulty: number): number {
  const gatherSpeed = 1.0 + (gatheringSkillLevel * GATHER_SPEED_PER_SKILL_LEVEL);
  const baseDuration = GATHER_RESOURCE_BASE_TICKS * gatherDifficulty;
  return Math.ceil(baseDuration / gatherSpeed);
}

/**
 * GatherBehavior - Find and harvest resources or seeds
 */
export class GatherBehavior extends BaseBehavior {
  readonly name = 'gather' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;
    const needs = entity.getComponent<NeedsComponent>(ComponentType.Needs);

    // Disable steering system so it doesn't override our gather movement
    this.disableSteering(entity);

    if (!inventory) {
      // No inventory component - this is a configuration error, not a normal case
      throw new Error(`[GatherBehavior] Agent ${entity.id} cannot gather: missing InventoryComponent`);
    }

    // STARVATION PREVENTION: Check hunger and override resource preference if starving
    let preferredType = agent.behaviorState?.resourceType as string | undefined;
    let isStarvingMode = false;

    if (needs) {
      const hunger = needs.hunger;

      // NOTE: NeedsComponent uses 0-1 scale (0 = starving, 1 = full)
      // If critically hungry (< 0.15), force food gathering and emit critical event
      if (hunger < 0.15) {
        // Override any other gathering task - survival comes first
        preferredType = undefined;
        isStarvingMode = true;

        // Emit critical need event for metrics tracking (only at truly critical levels)
        if (hunger < 0.05) {
          world.eventBus.emit({
            type: 'need:critical',
            source: entity.id,
            data: {
              agentId: entity.id,
              entityId: entity.id,
              needType: 'hunger',
              value: hunger,
              survivalRelevance: 100, // Starvation is critical for survival
            },
          });
        }
      }
      // If moderately hungry (< 0.30), prefer food but don't override critical tasks
      else if (hunger < 0.30 && !agent.behaviorState?.returnToBuild) {
        preferredType = undefined;
        isStarvingMode = true;
      }
    }

    // Find target (resource or plant with seeds)
    // In starvation mode, prioritize food over any other resource
    const target = this.findGatherTarget(world, position, preferredType, inventory, isStarvingMode);

    if (!target) {
      // No resources or seed-producing plants found within GATHER_MAX_RANGE (50 units)
      console.warn(`[GatherBehavior] Agent ${entity.id} completed gather: no resources found within ${GATHER_MAX_RANGE} units (preferredType: ${preferredType}, isStarvingMode: ${isStarvingMode}, position: ${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);

      // If we have a preferred type, clear it so the agent can try other resources
      // This prevents getting stuck in a loop of "can't find stone -> ask LLM -> gather stone again -> can't find stone"
      if (preferredType && !isStarvingMode) {
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behaviorState: {
            ...current.behaviorState,
            resourceType: undefined, // Clear preferred type
          },
        }));
        // Debug: Agent couldn't find preferred resource, falling back to any available
        // console.log(`[GatherBehavior] Cleared preferredType (${preferredType}) - will try any available resource`);
        // Don't complete yet - try again next tick with any resource type
        return;
      }

      // CRITICAL: Signal behavior completion so decision processor can assign new behavior
      // Without this, agent stays in 'gather' forever doing nothing
      this.complete(entity);
      return { complete: true, reason: 'no_resources_found' };
    }

    const targetPos = target.position;

    // Move toward target (with arrival slowdown) and check distance
    const distanceToTarget = this.moveToward(entity, targetPos, { arrivalDistance: HARVEST_DISTANCE });

    // Check if adjacent (within harvest distance)
    if (distanceToTarget <= HARVEST_DISTANCE) {
      this.stopAllMovement(entity);

      const workSpeedMultiplier = this.calculateWorkSpeed(entity);

      if (workSpeedMultiplier === 0) {
        // Too exhausted to work - return complete to let system decide next behavior
        console.warn(`[GatherBehavior] Agent ${entity.id} completed gather: too exhausted to work (energy: ${needs?.energy ?? 'N/A'})`);
        // CRITICAL: Signal behavior completion so decision processor can assign new behavior
        this.complete(entity);
        return { complete: true, reason: 'too_exhausted_to_work' };
      }

      if (target.type === 'resource') {
        // Check if this is a voxel resource (trees, rocks with height-based harvesting)
        const targetImpl = target.entity as EntityImpl;
        const voxelComp = targetImpl.getComponent<VoxelResourceComponent>(ComponentType.VoxelResource);
        if (voxelComp) {
          this.handleVoxelResourceGathering(entity, target.entity, world, inventory, agent);
        } else {
          this.handleResourceGathering(entity, target.entity, world, inventory, agent);
        }
      } else if (target.subtype === 'fruit') {
        this.gatherFruit(entity, target.entity, world, inventory, targetPos, workSpeedMultiplier);
      } else {
        this.gatherSeeds(entity, target.entity, world, inventory, targetPos, workSpeedMultiplier);
      }
    }
  }

  /**
   * Handle resource gathering with skill-based timing.
   * Gathers exactly 1 resource per completion.
   */
  handleResourceGathering(
    entity: EntityImpl,
    resourceEntity: Entity,
    world: World,
    inventory: InventoryComponent,
    agent: AgentComponent
  ): void {
    const state = agent.behaviorState as GatherBehaviorState;
    const resourceImpl = resourceEntity as EntityImpl;
    const resourceComp = resourceImpl.getComponent<ResourceComponent>(ComponentType.Resource)!;

    // Check if resource still has at least 1 unit
    if (resourceComp.amount < 1) {
      // Resource depleted, clear gather state and find new target
      this.clearGatherState(entity);
      return;
    }

    // Get gathering skill level
    const skillsComp = entity.getComponent<SkillsComponent>(ComponentType.Skills);
    const gatheringLevel = skillsComp?.levels.gathering ?? 0;

    // Check if we're already gathering this resource
    if (state.gatherTargetId === resourceEntity.id && state.gatherStartTick !== undefined) {
      // Continue gathering - check if enough time has passed
      const elapsedTicks = world.tick - state.gatherStartTick;
      const requiredTicks = state.gatherDurationTicks ?? GATHER_RESOURCE_BASE_TICKS;

      if (elapsedTicks >= requiredTicks) {
        // Gathering complete! Harvest exactly 1 resource
        this.completeResourceHarvest(entity, resourceEntity, world, inventory, agent, gatheringLevel);
        // Clear gather state to allow gathering again
        this.clearGatherState(entity);
      }
      // Still gathering - wait for next tick
    } else {
      // Start gathering this resource
      const gatherDifficulty = resourceComp.gatherDifficulty ?? 1.0;
      const durationTicks = calculateGatherDuration(gatheringLevel, gatherDifficulty);

      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behaviorState: {
          ...current.behaviorState,
          gatherTargetId: resourceEntity.id,
          gatherStartTick: world.tick,
          gatherDurationTicks: durationTicks,
        },
      }));
    }
  }

  /**
   * Handle voxel resource gathering (trees, rocks with height-based harvesting).
   * Agents can only cut from the base since they can't reach the top.
   * Harvesting reduces stability and may cause the structure to fall.
   */
  handleVoxelResourceGathering(
    entity: EntityImpl,
    resourceEntity: Entity,
    world: World,
    inventory: InventoryComponent,
    agent: AgentComponent
  ): void {
    const state = agent.behaviorState as GatherBehaviorState;
    const resourceImpl = resourceEntity as EntityImpl;
    const voxelComp = resourceImpl.getComponent<VoxelResourceComponent>(ComponentType.VoxelResource)!;
    const agentPos = entity.getComponent<PositionComponent>(ComponentType.Position)!;

    // Skip depleted or falling resources
    if (voxelComp.height <= 0 || voxelComp.isFalling || !voxelComp.harvestable) {
      this.clearGatherState(entity);
      return;
    }

    // Track harvester position for directional falling (tree falls away from harvester)
    resourceImpl.updateComponent<VoxelResourceComponent>(ComponentType.VoxelResource, (current) => ({
      ...current,
      lastHarvesterPosition: { x: agentPos.x, y: agentPos.y },
    }));

    // Get gathering skill level
    const skillsComp = entity.getComponent<SkillsComponent>(ComponentType.Skills);
    const gatheringLevel = skillsComp?.levels.gathering ?? 0;

    // Check if we're already gathering this resource
    if (state.gatherTargetId === resourceEntity.id && state.gatherStartTick !== undefined) {
      // Continue gathering - check if enough time has passed
      const elapsedTicks = world.tick - state.gatherStartTick;
      const requiredTicks = state.gatherDurationTicks ?? GATHER_RESOURCE_BASE_TICKS;

      if (elapsedTicks >= requiredTicks) {
        // Gathering complete! Harvest one level from base
        this.completeVoxelHarvest(entity, resourceEntity, world, inventory, agent, gatheringLevel);
        // Clear gather state to allow gathering again
        this.clearGatherState(entity);
      }
      // Still gathering - wait for next tick
    } else {
      // Start gathering this resource
      // Factor in both gatherDifficulty and material hardness
      const gatherDifficulty = voxelComp.gatherDifficulty ?? 1.0;
      const hardness = getMaterialHardness(voxelComp.material);

      // Hardness modifier for duration:
      // - Hardness 25 (wood): 0.75x duration (easier to cut)
      // - Hardness 50: 1.0x duration (baseline)
      // - Hardness 70 (granite): 1.4x duration (harder to cut)
      const hardnessModifier = 0.5 + hardness / 100;

      const baseDuration = calculateGatherDuration(gatheringLevel, gatherDifficulty);
      const durationTicks = Math.ceil(baseDuration * hardnessModifier);

      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behaviorState: {
          ...current.behaviorState,
          gatherTargetId: resourceEntity.id,
          gatherStartTick: world.tick,
          gatherDurationTicks: durationTicks,
        },
      }));
    }
  }

  /**
   * Complete harvesting one level of a voxel resource from the base.
   * Reduces stability and may trigger falling if base is weakened enough.
   */
  private completeVoxelHarvest(
    entity: EntityImpl,
    resourceEntity: Entity,
    world: World,
    inventory: InventoryComponent,
    agent: AgentComponent,
    gatheringLevel: number
  ): void {
    const resourceImpl = resourceEntity as EntityImpl;
    const voxelComp = resourceImpl.getComponent<VoxelResourceComponent>(ComponentType.VoxelResource)!;
    const resourcePos = resourceImpl.getComponent<PositionComponent>(ComponentType.Position);

    // Double-check resource is still harvestable
    if (voxelComp.height <= 0 || voxelComp.isFalling) {
      return;
    }

    // Get material hardness for tool wear and stability calculations
    const material = voxelComp.material;
    const hardness = getMaterialHardness(material);

    // Harvest from base (level 0) - reduces stability significantly
    // Hardness affects stability: harder materials are more stable
    const harvestedLevel = 0; // Always harvest from base since agents can't reach top
    const newStability = reduceStabilityFromHarvest(voxelComp, harvestedLevel, hardness);

    // Resources dropped = blocksPerLevel
    const harvestAmount = voxelComp.blocksPerLevel;

    // Apply tool wear - harder materials wear tools faster
    this.applyToolWearFromGathering(entity, world, hardness);

    // Update voxel component: reduce height by 1 and update stability
    resourceImpl.updateComponent<VoxelResourceComponent>(ComponentType.VoxelResource, (current) => ({
      ...current,
      height: current.height - 1,
      stability: newStability,
      lastHarvestTick: world.tick,
    }));

    // Calculate quality based on gathering skill
    const gatherQuality = calculateGatheringQuality(gatheringLevel, material);

    // Add to inventory
    try {
      const result = addToInventoryWithQuality(inventory, material, harvestAmount, gatherQuality);
      entity.updateComponent<InventoryComponent>(ComponentType.Inventory, () => result.inventory);

      // Record gathering stats
      const gatheringStats = entity.getComponent<GatheringStatsComponent>(ComponentType.GatheringStats);
      if (gatheringStats) {
        const currentDay = getCurrentDay(world);
        recordGathered(gatheringStats, material, result.amountAdded, currentDay);
        entity.updateComponent<GatheringStatsComponent>(ComponentType.GatheringStats, () => gatheringStats);
      }

      // Award gathering XP (higher XP for voxel resources due to difficulty)
      const skillsComp = entity.getComponent<SkillsComponent>(ComponentType.Skills);
      if (skillsComp) {
        const baseXP = 10 * result.amountAdded; // 10 XP per resource from voxels
        const oldLevel = skillsComp.levels.gathering;
        const xpResult = addSkillXP(skillsComp, 'gathering', baseXP);
        entity.updateComponent<SkillsComponent>(ComponentType.Skills, () => xpResult.component);

        world.eventBus.emit({
          type: 'skill:xp_gain',
          source: entity.id,
          data: {
            agentId: entity.id,
            skillId: 'gathering',
            amount: baseXP,
            source: 'voxel_gathering',
          },
        });

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

      // Emit resource gathered event
      world.eventBus.emit({
        type: 'resource:gathered',
        source: entity.id,
        data: {
          agentId: entity.id,
          resourceType: material,
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
      const spatialMemory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);
      if (spatialMemory && resourcePos) {
        addSpatialMemory(
          spatialMemory,
          {
            type: 'resource_location',
            x: resourcePos.x,
            y: resourcePos.y,
            entityId: resourceEntity.id,
            metadata: { resourceType: material, isVoxel: true },
          },
          world.tick,
          100
        );
      }

      // Check if resource is depleted (height <= 0)
      const updatedVoxel = resourceImpl.getComponent<VoxelResourceComponent>(ComponentType.VoxelResource);
      if (updatedVoxel && updatedVoxel.height <= 0) {
        world.eventBus.emit({
          type: 'resource:depleted',
          source: resourceEntity.id,
          data: {
            resourceId: resourceEntity.id,
            resourceType: material,
            agentId: entity.id,
          },
        });
      }
    } catch (error) {
      // Inventory full or weight limit exceeded
      this.handleInventoryFull(entity, world, agent);
    }
  }

  /**
   * Clear the gather progress state.
   */
  private clearGatherState(entity: EntityImpl): void {
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => {
      const state = { ...current.behaviorState } as GatherBehaviorState;
      delete state.gatherTargetId;
      delete state.gatherStartTick;
      delete state.gatherDurationTicks;
      return {
        ...current,
        behaviorState: state,
      };
    });
  }

  /**
   * Complete harvesting exactly 1 resource after gathering timer completes.
   */
  private completeResourceHarvest(
    entity: EntityImpl,
    resourceEntity: Entity,
    world: World,
    inventory: InventoryComponent,
    agent: AgentComponent,
    gatheringLevel: number
  ): void {
    const resourceImpl = resourceEntity as EntityImpl;
    const resourceComp = resourceImpl.getComponent<ResourceComponent>(ComponentType.Resource)!;
    const resourcePos = resourceImpl.getComponent<PositionComponent>(ComponentType.Position);

    // Double-check resource still has at least 1 unit
    if (resourceComp.amount < 1) {
      return;
    }

    // Always harvest exactly 1 unit
    const harvestAmount = 1;

    // Update resource
    resourceImpl.updateComponent<ResourceComponent>('resource', (current) => ({
      ...current,
      amount: Math.max(0, current.amount - harvestAmount),
    }));

    // Calculate quality based on gathering skill (Phase 10)
    const gatherQuality = calculateGatheringQuality(gatheringLevel, resourceComp.resourceType);

    // Add to inventory WITH QUALITY
    try {
      const result = addToInventoryWithQuality(inventory, resourceComp.resourceType, harvestAmount, gatherQuality);
      entity.updateComponent<InventoryComponent>(ComponentType.Inventory, () => result.inventory);

      // Record gathering stats
      const gatheringStats = entity.getComponent<GatheringStatsComponent>(ComponentType.GatheringStats);
      if (gatheringStats) {
        const currentDay = getCurrentDay(world);
        recordGathered(gatheringStats, resourceComp.resourceType, result.amountAdded, currentDay);
        entity.updateComponent<GatheringStatsComponent>(ComponentType.GatheringStats, () => gatheringStats);
      }

      // Award gathering XP (5 base XP per resource gathered)
      const skillsComp = entity.getComponent<SkillsComponent>(ComponentType.Skills);
      if (skillsComp) {
        const baseXP = 5 * result.amountAdded;
        const oldLevel = skillsComp.levels.gathering;
        const xpResult = addSkillXP(skillsComp, 'gathering', baseXP);
        entity.updateComponent<SkillsComponent>(ComponentType.Skills, () => xpResult.component);

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

      // Emit resource gathered event
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
      // Update spatial memory with resource location
      const spatialMemory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);
      if (spatialMemory && resourcePos) {
        addSpatialMemory(
          spatialMemory,
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

  private findGatherTarget(
    world: World,
    position: PositionComponent,
    preferredType: string | undefined,
    _inventory: InventoryComponent,
    isStarvingMode: boolean = false
  ): { type: 'resource' | 'plant'; subtype?: 'fruit' | 'seeds'; entity: Entity; position: { x: number; y: number }; distance: number } | null {
    // STARVATION MODE: Prioritize food gathering above all else
    // When starving, search for edible fruit first regardless of other preferences
    if (isStarvingMode) {
      const fruitTarget = this.findNearestPlantWithFruit(world, position);
      if (fruitTarget) {
        return { type: 'plant', subtype: 'fruit', entity: fruitTarget.entity, position: fruitTarget.position, distance: fruitTarget.distance };
      }
      // No fruit found - starving agents will wander to find food
      // Don't fallback to other resources when starving
      return null;
    }

    const isSeekingSeeds = preferredType === 'seeds';
    const isSeekingPlantFruit = preferredType && PLANT_FRUIT_TYPES.has(preferredType.toLowerCase());

    // If explicitly seeking seeds, only look for plants with seeds
    if (isSeekingSeeds) {
      const plantTarget = this.findNearestPlantWithSeeds(world, position);
      if (plantTarget) {
        return { type: 'plant', subtype: 'seeds', entity: plantTarget.entity, position: plantTarget.position, distance: plantTarget.distance };
      }
      return null;
    }

    // If seeking fruit/berries, look for plants with fruit
    if (isSeekingPlantFruit) {
      const plantTarget = this.findNearestPlantWithFruit(world, position);
      if (plantTarget) {
        return { type: 'plant', subtype: 'fruit', entity: plantTarget.entity, position: plantTarget.position, distance: plantTarget.distance };
      }
      // Don't return null yet - also check resources as fallback
    }

    // Look for the specified resource type
    const resourceTarget = this.findNearestResource(world, position, preferredType);

    if (resourceTarget) {
      return { type: 'resource', entity: resourceTarget.entity, position: resourceTarget.position, distance: resourceTarget.distance };
    }

    // Fallback: if no resources found and no specific type requested, try plants
    if (!preferredType) {
      // Try plants with fruit first (for food)
      const fruitTarget = this.findNearestPlantWithFruit(world, position);
      if (fruitTarget) {
        return { type: 'plant', subtype: 'fruit', entity: fruitTarget.entity, position: fruitTarget.position, distance: fruitTarget.distance };
      }
      // Then try plants with seeds
      const seedTarget = this.findNearestPlantWithSeeds(world, position);
      if (seedTarget) {
        return { type: 'plant', subtype: 'seeds', entity: seedTarget.entity, position: seedTarget.position, distance: seedTarget.distance };
      }
    }

    return null;
  }

  private findNearestResource(
    world: World,
    position: PositionComponent,
    preferredType: string | undefined
  ): { entity: Entity; position: { x: number; y: number }; distance: number } | null {
    let bestScore = Infinity;
    let bestResource: Entity | null = null;
    let bestPosition: { x: number; y: number } | null = null;
    let bestDistance = Infinity;

    if (chunkSpatialQuery) {
      // Use ChunkSpatialQuery for efficient nearby lookups
      const resourcesInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        GATHER_MAX_RANGE,
        [ComponentType.Resource]
      );

      // WORKAROUND: ChunkCache entity indexing is not implemented yet
      // If spatial query returns 0, fall back to global query
      if (resourcesInRadius.length === 0) {
        const globalResources = world
          .query()
          .with(ComponentType.Resource)
          .with(ComponentType.Position)
          .executeEntities();

        for (const resource of globalResources) {
          const resourceImpl = resource as EntityImpl;
          const resourceComp = resourceImpl.getComponent<ResourceComponent>(ComponentType.Resource)!;
          const resourcePos = resourceImpl.getComponent<PositionComponent>(ComponentType.Position)!;

          if (!resourceComp.harvestable) continue;
          if (resourceComp.amount <= 0) continue;
          if (preferredType && resourceComp.resourceType !== preferredType) continue;

          const distanceToAgent = this.distance(position, resourcePos);
          if (distanceToAgent > GATHER_MAX_RANGE) continue;

          const distanceToHome = Math.sqrt(resourcePos.x * resourcePos.x + resourcePos.y * resourcePos.y);
          let score = distanceToAgent;
          if (distanceToHome > HOME_RADIUS) {
            score += (distanceToHome - HOME_RADIUS) * 2.0;
          }

          if (score < bestScore) {
            bestScore = score;
            bestResource = resource;
            bestPosition = { x: resourcePos.x, y: resourcePos.y };
            bestDistance = distanceToAgent;
          }
        }
      }

      for (const { entity: resource, distance: distanceToAgent } of resourcesInRadius) {
        const resourceImpl = resource as EntityImpl;
        const resourceComp = resourceImpl.getComponent<ResourceComponent>(ComponentType.Resource)!;
        const resourcePos = resourceImpl.getComponent<PositionComponent>(ComponentType.Position)!;

        // Skip non-harvestable resources
        if (!resourceComp.harvestable) continue;
        if (resourceComp.amount <= 0) continue;

        // If preferred type specified, only consider that type
        if (preferredType && resourceComp.resourceType !== preferredType) continue;

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

      // Also search voxel resources using chunk queries
      const voxelResourcesInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        GATHER_MAX_RANGE,
        [ComponentType.VoxelResource]
      );

      for (const { entity: voxelResource, distance: distanceToAgent } of voxelResourcesInRadius) {
        const voxelImpl = voxelResource as EntityImpl;
        const voxelComp = voxelImpl.getComponent<VoxelResourceComponent>(ComponentType.VoxelResource)!;
        const voxelPos = voxelImpl.getComponent<PositionComponent>(ComponentType.Position)!;

        // Skip non-harvestable, depleted, or falling resources
        if (!voxelComp.harvestable) continue;
        if (voxelComp.height <= 0) continue;
        if (voxelComp.isFalling) continue;

        // If preferred type specified, check if material matches
        if (preferredType && voxelComp.material !== preferredType) continue;

        // Distance from resource to home (0, 0)
        const distanceToHome = Math.sqrt(voxelPos.x * voxelPos.x + voxelPos.y * voxelPos.y);

        // Scoring: prefer resources near home AND near agent
        let score = distanceToAgent;
        if (distanceToHome > HOME_RADIUS) {
          // Penalize resources far from home (add 2x the excess distance)
          score += (distanceToHome - HOME_RADIUS) * 2.0;
        }

        if (score < bestScore) {
          bestScore = score;
          bestResource = voxelResource;
          bestPosition = { x: voxelPos.x, y: voxelPos.y };
          bestDistance = distanceToAgent;
        }
      }
    } else {
      // Fallback to global queries
      const resources = world
        .query()
        .with(ComponentType.Resource)
        .with(ComponentType.Position)
        .executeEntities();

      for (const resource of resources) {
        const resourceImpl = resource as EntityImpl;
        const resourceComp = resourceImpl.getComponent<ResourceComponent>(ComponentType.Resource)!;
        const resourcePos = resourceImpl.getComponent<PositionComponent>(ComponentType.Position)!;

        // Skip non-harvestable resources
        if (!resourceComp.harvestable) continue;
        if (resourceComp.amount <= 0) continue;

        // If preferred type specified, only consider that type
        if (preferredType && resourceComp.resourceType !== preferredType) continue;

        const distanceToAgent = this.distance(position, resourcePos);

        // Only consider resources within max gather range
        if (distanceToAgent > GATHER_MAX_RANGE) continue;

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

      // Also search voxel resources
      const voxelResources = world
        .query()
        .with(ComponentType.VoxelResource)
        .with(ComponentType.Position)
        .executeEntities();

      for (const voxelResource of voxelResources) {
        const voxelImpl = voxelResource as EntityImpl;
        const voxelComp = voxelImpl.getComponent<VoxelResourceComponent>(ComponentType.VoxelResource)!;
        const voxelPos = voxelImpl.getComponent<PositionComponent>(ComponentType.Position)!;

        // Skip non-harvestable, depleted, or falling resources
        if (!voxelComp.harvestable) continue;
        if (voxelComp.height <= 0) continue;
        if (voxelComp.isFalling) continue;

        // If preferred type specified, check if material matches
        if (preferredType && voxelComp.material !== preferredType) continue;

        const distanceToAgent = this.distance(position, voxelPos);

        // Only consider resources within max gather range
        if (distanceToAgent > GATHER_MAX_RANGE) continue;

        // Distance from resource to home (0, 0)
        const distanceToHome = Math.sqrt(voxelPos.x * voxelPos.x + voxelPos.y * voxelPos.y);

        // Scoring: prefer resources near home AND near agent
        let score = distanceToAgent;
        if (distanceToHome > HOME_RADIUS) {
          // Penalize resources far from home (add 2x the excess distance)
          score += (distanceToHome - HOME_RADIUS) * 2.0;
        }

        if (score < bestScore) {
          bestScore = score;
          bestResource = voxelResource;
          bestPosition = { x: voxelPos.x, y: voxelPos.y };
          bestDistance = distanceToAgent;
        }
      }
    }

    return bestResource ? { entity: bestResource, position: bestPosition!, distance: bestDistance } : null;
  }

  /**
   * Find the nearest plant with harvestable fruit.
   * Uses home-biased scoring and distance limits like resource gathering.
   */
  private findNearestPlantWithFruit(
    world: World,
    position: PositionComponent
  ): { entity: Entity; position: { x: number; y: number }; distance: number } | null {
    let bestScore = Infinity;
    let bestPlant: Entity | null = null;
    let bestPos: { x: number; y: number } | null = null;
    let bestDistance = Infinity;

    if (chunkSpatialQuery) {
      // Use ChunkSpatialQuery for efficient nearby lookups
      const plantsInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        GATHER_MAX_RANGE,
        [ComponentType.Plant]
      );

      console.log('[GatherBehavior] findNearestPlantWithFruit: ChunkSpatialQuery returned', plantsInRadius.length, 'plants within', GATHER_MAX_RANGE, 'of', position.x.toFixed(1), position.y.toFixed(1));

      for (const { entity: plant, distance: distanceToAgent } of plantsInRadius) {
        const plantImpl = plant as EntityImpl;
        const plantComp = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);
        const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position)!;

        if (!plantComp) continue;

        // Check if plant has harvestable fruit and is edible species
        const hasFruit = (plantComp.fruitCount ?? 0) > 0;
        const isEdible = isEdibleSpecies(plantComp.speciesId);

        if (hasFruit && isEdible) {
          // Distance from plant to home (0, 0)
          const distanceToHome = Math.sqrt(plantPos.x * plantPos.x + plantPos.y * plantPos.y);

          // Scoring: prefer plants near home AND near agent (same as resources)
          let score = distanceToAgent;
          if (distanceToHome > HOME_RADIUS) {
            // Penalize plants far from home (add 2x the excess distance)
            score += (distanceToHome - HOME_RADIUS) * 2.0;
          }

          if (score < bestScore) {
            bestScore = score;
            bestPlant = plant;
            bestPos = { x: plantPos.x, y: plantPos.y };
            bestDistance = distanceToAgent;
          }
        }
      }
    } else {
      // Fallback to global query
      const plants = world
        .query()
        .with(ComponentType.Plant)
        .with(ComponentType.Position)
        .executeEntities();

      for (const plant of plants) {
        const plantImpl = plant as EntityImpl;
        const plantComp = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);
        const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position)!;

        if (!plantComp) continue;

        // Check if plant has harvestable fruit and is edible species
        const hasFruit = (plantComp.fruitCount ?? 0) > 0;
        const isEdible = isEdibleSpecies(plantComp.speciesId);

        if (hasFruit && isEdible) {
          const distanceToAgent = this.distance(position, plantPos);

          // Only consider plants within max gather range
          if (distanceToAgent > GATHER_MAX_RANGE) continue;

          // Distance from plant to home (0, 0)
          const distanceToHome = Math.sqrt(plantPos.x * plantPos.x + plantPos.y * plantPos.y);

          // Scoring: prefer plants near home AND near agent (same as resources)
          let score = distanceToAgent;
          if (distanceToHome > HOME_RADIUS) {
            // Penalize plants far from home (add 2x the excess distance)
            score += (distanceToHome - HOME_RADIUS) * 2.0;
          }

          if (score < bestScore) {
            bestScore = score;
            bestPlant = plant;
            bestPos = { x: plantPos.x, y: plantPos.y };
            bestDistance = distanceToAgent;
          }
        }
      }
    }

    return bestPlant ? { entity: bestPlant, position: bestPos!, distance: bestDistance } : null;
  }

  /**
   * Find the nearest plant with seeds available.
   * Uses home-biased scoring and distance limits like resource gathering.
   */
  private findNearestPlantWithSeeds(
    world: World,
    position: PositionComponent
  ): { entity: Entity; position: { x: number; y: number }; distance: number } | null {
    let bestScore = Infinity;
    let bestPlant: Entity | null = null;
    let bestPos: { x: number; y: number } | null = null;
    let bestDistance = Infinity;

    if (chunkSpatialQuery) {
      // Use ChunkSpatialQuery for efficient nearby lookups
      const plantsInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        GATHER_MAX_RANGE,
        [ComponentType.Plant]
      );

      for (const { entity: plant, distance: distanceToAgent } of plantsInRadius) {
        const plantImpl = plant as EntityImpl;
        const plantComp = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);
        const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position)!;

        if (!plantComp) continue;

        // Check if plant has seeds available for gathering
        const validStages = ['mature', 'seeding', 'senescence'];
        const hasSeeds = plantComp.seedsProduced > 0;
        const isValidStage = validStages.includes(plantComp.stage);

        if (hasSeeds && isValidStage) {
          // Distance from plant to home (0, 0)
          const distanceToHome = Math.sqrt(plantPos.x * plantPos.x + plantPos.y * plantPos.y);

          // Scoring: prefer plants near home AND near agent (same as resources)
          let score = distanceToAgent;
          if (distanceToHome > HOME_RADIUS) {
            // Penalize plants far from home (add 2x the excess distance)
            score += (distanceToHome - HOME_RADIUS) * 2.0;
          }

          if (score < bestScore) {
            bestScore = score;
            bestPlant = plant;
            bestPos = { x: plantPos.x, y: plantPos.y };
            bestDistance = distanceToAgent;
          }
        }
      }
    } else {
      // Fallback to global query
      const plants = world
        .query()
        .with(ComponentType.Plant)
        .with(ComponentType.Position)
        .executeEntities();

      for (const plant of plants) {
        const plantImpl = plant as EntityImpl;
        const plantComp = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);
        const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position)!;

        if (!plantComp) continue;

        // Check if plant has seeds available for gathering
        const validStages = ['mature', 'seeding', 'senescence'];
        const hasSeeds = plantComp.seedsProduced > 0;
        const isValidStage = validStages.includes(plantComp.stage);

        if (hasSeeds && isValidStage) {
          const distanceToAgent = this.distance(position, plantPos);

          // Only consider plants within max gather range
          if (distanceToAgent > GATHER_MAX_RANGE) continue;

          // Distance from plant to home (0, 0)
          const distanceToHome = Math.sqrt(plantPos.x * plantPos.x + plantPos.y * plantPos.y);

          // Scoring: prefer plants near home AND near agent (same as resources)
          let score = distanceToAgent;
          if (distanceToHome > HOME_RADIUS) {
            // Penalize plants far from home (add 2x the excess distance)
            score += (distanceToHome - HOME_RADIUS) * 2.0;
          }

          if (score < bestScore) {
            bestScore = score;
            bestPlant = plant;
            bestPos = { x: plantPos.x, y: plantPos.y };
            bestDistance = distanceToAgent;
          }
        }
      }
    }

    return bestPlant ? { entity: bestPlant, position: bestPos!, distance: bestDistance } : null;
  }

  private calculateWorkSpeed(entity: EntityImpl): number {
    const needs = entity.getComponent<NeedsComponent>(ComponentType.Needs);

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

    if (energy < ENERGY_CRITICAL) {
      return 0; // Cannot work
    } else if (energy < ENERGY_LOW) {
      return WORK_SPEED_CRITICAL; // -50% work speed
    } else if (energy < ENERGY_MODERATE) {
      return WORK_SPEED_LOW; // -25% work speed
    } else if (energy < ENERGY_HIGH) {
      return 0.9; // -10% work speed
    }

    return 1.0; // Full speed
  }

  gatherSeeds(
    entity: EntityImpl,
    plantEntity: Entity,
    world: World,
    inventory: InventoryComponent,
    targetPos: { x: number; y: number },
    workSpeedMultiplier: number
  ): void {
    const plantImpl = plantEntity as EntityImpl;
    const plantComp = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);

    if (!plantComp) {
      return;
    }

    // Calculate seed yield based on plant health and agent skill
    // Formula from spec: baseSeedCount * (health/100) * stageMod * skillMod
    const baseSeedCount = 5;
    const healthMod = plantComp.health / 100;
    const stageMod = plantComp.stage === 'seeding' ? 1.5 : 1.0;
    const farmingSkill = ENERGY_MODERATE; // Default skill (TODO: get from agent skills when implemented)
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

    // Calculate seed quality based on farming skill and plant health
    const skillsComp = entity.getComponent<SkillsComponent>(ComponentType.Skills);
    const farmingLevel = skillsComp?.levels.farming ?? 0;
    // Seeds get quality based on plant health and farming skill
    // Formula: base 50 + (skill * 8) + (health / 10) - gives range ~50-100
    const seedQuality = Math.min(100, Math.max(0,
      ENERGY_MODERATE + (farmingLevel * 8) + (plantComp.health / 10) + (Math.random() - 0.5) * 10
    ));

    try {
      const result = addToInventoryWithQuality(inventory, seedItemId, seedsToGather, Math.round(seedQuality));
      entity.updateComponent<InventoryComponent>(ComponentType.Inventory, () => result.inventory);

      // Record gathering stats for seeds
      const gatheringStats = entity.getComponent<GatheringStatsComponent>(ComponentType.GatheringStats);
      if (gatheringStats) {
        const currentDay = getCurrentDay(world);
        recordGathered(gatheringStats, seedItemId, result.amountAdded, currentDay);
        entity.updateComponent<GatheringStatsComponent>(ComponentType.GatheringStats, () => gatheringStats);
      }


      // Update plant - reduce seedsProduced
      plantImpl.updateComponent<PlantComponent>(ComponentType.Plant, (current) => {
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
        const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;
        this.handleInventoryFull(entity, world, agent);
      }
    } catch (error) {
      // Inventory full
      const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;
      this.handleInventoryFull(entity, world, agent);
    }
  }

  /**
   * Gather fruit from a plant (e.g., berries from berry bushes).
   * Adds the fruit to inventory and reduces plant's fruitCount.
   */
  gatherFruit(
    entity: EntityImpl,
    plantEntity: Entity,
    world: World,
    inventory: InventoryComponent,
    targetPos: { x: number; y: number },
    workSpeedMultiplier: number
  ): void {
    const plantImpl = plantEntity as EntityImpl;
    const plantComp = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);

    if (!plantComp) {
      return;
    }

    // Check if plant has fruit
    const fruitCount = plantComp.fruitCount ?? 0;
    if (fruitCount < 1) {
      return;
    }

    // Calculate fruit yield based on work speed
    // Gather 1-3 fruit per action based on work speed
    const baseYield = Math.max(1, Math.floor(2 * workSpeedMultiplier));
    const fruitToGather = Math.min(baseYield, fruitCount);

    if (fruitToGather < 1) {
      return;
    }

    // Determine the food item ID based on species
    // blueberry-bush -> blueberry, raspberry-bush -> raspberry, etc.
    const speciesId = plantComp.speciesId;
    let foodItemId = speciesId;
    if (speciesId === 'berry_bush') {
      foodItemId = 'berry'; // Legacy generic berry
    } else if (speciesId.endsWith('-bush') || speciesId.endsWith('_bush')) {
      // Strip -bush suffix: blueberry-bush -> blueberry, raspberry-bush -> raspberry, etc.
      foodItemId = speciesId.replace(/-bush$/, '').replace(/_bush$/, '');
    }

    // Calculate fruit quality based on gathering skill and plant health
    const skillsComp = entity.getComponent<SkillsComponent>(ComponentType.Skills);
    const gatheringLevel = skillsComp?.levels.gathering ?? 0;
    // Fruit quality: base 50 + (skill * 5) + (health / 5) - gives range ~50-100
    const fruitQuality = Math.min(100, Math.max(0,
      50 + (gatheringLevel * 5) + (plantComp.health / 5) + (Math.random() - 0.5) * 10
    ));

    try {
      const result = addToInventoryWithQuality(inventory, foodItemId, fruitToGather, Math.round(fruitQuality));
      entity.updateComponent<InventoryComponent>(ComponentType.Inventory, () => result.inventory);

      // Record gathering stats for fruit
      const gatheringStats = entity.getComponent<GatheringStatsComponent>(ComponentType.GatheringStats);
      if (gatheringStats) {
        const currentDay = getCurrentDay(world);
        recordGathered(gatheringStats, foodItemId, result.amountAdded, currentDay);
        entity.updateComponent<GatheringStatsComponent>(ComponentType.GatheringStats, () => gatheringStats);
      }

      // Award gathering XP
      if (skillsComp) {
        const baseXP = 3 * result.amountAdded; // 3 XP per fruit gathered
        const xpResult = addSkillXP(skillsComp, 'gathering', baseXP);
        entity.updateComponent<SkillsComponent>(ComponentType.Skills, () => xpResult.component);

        // Emit skill XP event for metrics tracking
        world.eventBus.emit({
          type: 'skill:xp_gain',
          source: entity.id,
          data: {
            agentId: entity.id,
            skillId: 'gathering',
            amount: baseXP,
            source: 'fruit_gathering',
          },
        });
      }

      // Update plant - reduce fruitCount
      // CRITICAL FIX: Reset stage if all fruit harvested to enable regrowth
      const species = (world as any).plantSpeciesLookup?.(plantComp.speciesId);
      const newFruitCount = Math.max(0, (plantComp.fruitCount ?? 0) - result.amountAdded);

      plantImpl.updateComponent<PlantComponent>(ComponentType.Plant, (current) => {
        const updated = Object.create(Object.getPrototypeOf(current));
        Object.assign(updated, current);
        updated.fruitCount = newFruitCount;

        // If all fruit harvested and species supports regrowth, reset stage
        if (newFruitCount === 0 && species?.harvestResetStage && !species.harvestDestroysPlant) {
          updated.stage = species.harvestResetStage;
        }

        return updated;
      });

      // Emit fruit:gathered event
      world.eventBus.emit({
        type: 'resource:gathered',
        source: entity.id,
        data: {
          agentId: entity.id,
          resourceType: foodItemId,
          amount: result.amountAdded,
          position: targetPos,
          sourceEntityId: plantEntity.id,
        },
      });

      // Check if inventory is now full
      if (result.inventory.currentWeight >= result.inventory.maxWeight) {
        const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;
        this.handleInventoryFull(entity, world, agent);
      }
    } catch (error) {
      // Inventory full
      const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;
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
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
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
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'build',
        behaviorState: { buildingType },
      }));
    } else if (stillMissing.length > 0) {
      // Still missing something, keep gathering
      const nextMissing = stillMissing[0]!;

      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
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

  /**
   * Apply tool wear when harvesting a resource.
   * Checks if agent has a tool equipped in main_hand and applies durability loss.
   *
   * @param entity - The agent entity
   * @param world - The world for event emission
   * @param materialHardness - Hardness of material being harvested (0-100)
   */
  private applyToolWearFromGathering(
    entity: EntityImpl,
    world: World,
    materialHardness: number
  ): void {
    // Check if agent has equipment slots
    const equipment = entity.getComponent<EquipmentSlotsComponent>(ComponentType.EquipmentSlots);
    if (!equipment) {
      return; // No equipment system, skip tool wear
    }

    // Check for equipped tool in main hand
    const equippedTool = getEquippedItem(equipment, 'main_hand');
    if (!equippedTool) {
      return; // No tool equipped, skip wear
    }

    // Apply tool wear with material hardness
    try {
      const durabilitySystem = getDurabilitySystem();
      // Set event bus if available (for tool_broken events)
      durabilitySystem.setEventBus(world.eventBus);

      durabilitySystem.applyToolWear(equippedTool.itemId, 'gathering', {
        agentId: entity.id,
        materialHardness,
      });
    } catch (error) {
      // Tool might be broken or not a valid tool - emit event and continue
      world.eventBus.emit({
        type: 'gathering:tool_error',
        source: entity.id,
        data: {
          agentId: entity.id,
          toolId: equippedTool.itemId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 * @deprecated Use gatherBehaviorWithContext for better performance
 */
export function gatherBehavior(entity: EntityImpl, world: World): void {
  const behavior = new GatherBehavior();
  behavior.execute(entity, world);
}

/**
 * Modern version using BehaviorContext.
 * Provides optimized spatial queries and pre-fetched components.
 * @example registerBehaviorWithContext('gather', gatherBehaviorWithContext);
 */
export function gatherBehaviorWithContext(ctx: import('../BehaviorContext.js').BehaviorContext): import('../BehaviorContext.js').BehaviorResult | void {
  const { inventory, needs } = ctx;

  if (!inventory) {
    throw new Error(`[GatherBehavior] Agent ${ctx.entity.id} cannot gather: missing InventoryComponent`);
  }

  // STARVATION PREVENTION: Check hunger and override resource preference if starving
  let preferredType = ctx.getState<string>('resourceType');
  let isStarvingMode = false;

  if (needs) {
    const hunger = needs.hunger;

    if (hunger < 0.15) {
      preferredType = undefined;
      isStarvingMode = true;

      if (hunger < 0.05) {
        ctx.emit({
          type: 'need:critical',
          data: {
            agentId: ctx.entity.id,
            entityId: ctx.entity.id,
            needType: 'hunger',
            value: hunger,
            survivalRelevance: 100,
          },
        });
      }
    } else if (hunger < 0.30 && !ctx.getState('returnToBuild')) {
      preferredType = undefined;
      isStarvingMode = true;
    }
  }

  // Find target using context
  const target = findGatherTargetWithContext(ctx, preferredType, isStarvingMode);

  if (!target) {
    if (preferredType && !isStarvingMode) {
      ctx.updateState({ resourceType: undefined });
      return;
    }

    return ctx.complete('no_resources_found');
  }

  const distanceToTarget = ctx.moveToward(target.position, { arrivalDistance: HARVEST_DISTANCE });

  if (distanceToTarget <= HARVEST_DISTANCE) {
    ctx.stopMovement();

    const workSpeedMultiplier = calculateWorkSpeedFromContext(ctx);
    if (workSpeedMultiplier === 0) {
      return ctx.complete('too_exhausted_to_work');
    }

    // Delegate to class methods for actual gathering
    const behavior = new GatherBehavior();
    if (target.type === 'resource') {
      const targetImpl = target.entity as EntityImpl;
      const voxelComp = targetImpl.getComponent<VoxelResourceComponent>(ComponentType.VoxelResource);
      if (voxelComp) {
        behavior.handleVoxelResourceGathering(ctx.entity, target.entity, { tick: ctx.tick, eventBus: { emit: (e: any) => ctx.emit(e) } } as any, inventory, ctx.agent);
      } else {
        behavior.handleResourceGathering(ctx.entity, target.entity, { tick: ctx.tick, eventBus: { emit: (e: any) => ctx.emit(e) } } as any, inventory, ctx.agent);
      }
    } else if (target.subtype === 'fruit') {
      behavior.gatherFruit(ctx.entity, target.entity, { tick: ctx.tick, eventBus: { emit: (e: any) => ctx.emit(e) } } as any, inventory, target.position, workSpeedMultiplier);
    } else {
      behavior.gatherSeeds(ctx.entity, target.entity, { tick: ctx.tick, eventBus: { emit: (e: any) => ctx.emit(e) } } as any, inventory, target.position, workSpeedMultiplier);
    }
  }
}

/**
 * Find gather target using BehaviorContext spatial queries
 */
function findGatherTargetWithContext(
  ctx: import('../BehaviorContext.js').BehaviorContext,
  preferredType: string | undefined,
  isStarvingMode: boolean
): { type: 'resource' | 'plant'; subtype?: 'fruit' | 'seeds'; entity: Entity; position: { x: number; y: number }; distance: number } | null {
  if (isStarvingMode) {
    const nearbyPlants = ctx.getEntitiesInRadius(GATHER_MAX_RANGE, [ComponentType.Plant]);
    for (const { entity: plant, position: plantPos, distance } of nearbyPlants) {
      const plantImpl = plant as EntityImpl;
      const plantComp = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);
      if (!plantComp) continue;

      const hasFruit = (plantComp.fruitCount ?? 0) > 0;
      const isEdible = isEdibleSpecies(plantComp.speciesId);

      if (hasFruit && isEdible) {
        return { type: 'plant', subtype: 'fruit', entity: plant, position: plantPos, distance };
      }
    }
    return null;
  }

  const isSeekingSeeds = preferredType === 'seeds';
  const isSeekingPlantFruit = preferredType && PLANT_FRUIT_TYPES.has(preferredType.toLowerCase());

  if (isSeekingSeeds || isSeekingPlantFruit) {
    const nearbyPlants = ctx.getEntitiesInRadius(GATHER_MAX_RANGE, [ComponentType.Plant]);
    for (const { entity: plant, position: plantPos, distance } of nearbyPlants) {
      const plantImpl = plant as EntityImpl;
      const plantComp = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);
      if (!plantComp) continue;

      if (isSeekingSeeds) {
        const validStages = ['mature', 'seeding', 'senescence'];
        const hasSeeds = plantComp.seedsProduced > 0;
        const isValidStage = validStages.includes(plantComp.stage);
        if (hasSeeds && isValidStage) {
          return { type: 'plant', subtype: 'seeds', entity: plant, position: plantPos, distance };
        }
      } else if (isSeekingPlantFruit) {
        const hasFruit = (plantComp.fruitCount ?? 0) > 0;
        const isEdible = isEdibleSpecies(plantComp.speciesId);
        if (hasFruit && isEdible) {
          return { type: 'plant', subtype: 'fruit', entity: plant, position: plantPos, distance };
        }
      }
    }
    if (isSeekingSeeds) return null;
  }

  // Look for resources
  const nearbyResources = ctx.getEntitiesInRadius(GATHER_MAX_RANGE, [ComponentType.Resource, ComponentType.VoxelResource]);
  let bestScore = Infinity;
  let bestResource: { type: 'resource'; entity: Entity; position: { x: number; y: number }; distance: number } | null = null;

  for (const { entity: resource, position: resourcePos, distance: distanceToAgent } of nearbyResources) {
    const resourceImpl = resource as EntityImpl;
    const resourceComp = resourceImpl.getComponent<ResourceComponent>(ComponentType.Resource);
    const voxelComp = resourceImpl.getComponent<VoxelResourceComponent>(ComponentType.VoxelResource);

    if (resourceComp) {
      if (!resourceComp.harvestable || resourceComp.amount <= 0) continue;
      if (preferredType && resourceComp.resourceType !== preferredType) continue;
    } else if (voxelComp) {
      if (!voxelComp.harvestable || voxelComp.height <= 0 || voxelComp.isFalling) continue;
      if (preferredType && voxelComp.material !== preferredType) continue;
    } else {
      continue;
    }

    const distanceToHome = Math.sqrt(resourcePos.x * resourcePos.x + resourcePos.y * resourcePos.y);
    let score = distanceToAgent;
    if (distanceToHome > HOME_RADIUS) {
      score += (distanceToHome - HOME_RADIUS) * 2.0;
    }

    if (score < bestScore) {
      bestScore = score;
      bestResource = { type: 'resource', entity: resource, position: resourcePos, distance: distanceToAgent };
    }
  }

  if (bestResource) return bestResource;

  // Fallback to plants
  if (!preferredType) {
    const nearbyPlants = ctx.getEntitiesInRadius(GATHER_MAX_RANGE, [ComponentType.Plant]);
    for (const { entity: plant, position: plantPos, distance } of nearbyPlants) {
      const plantImpl = plant as EntityImpl;
      const plantComp = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);
      if (!plantComp) continue;

      const hasFruit = (plantComp.fruitCount ?? 0) > 0;
      const isEdible = isEdibleSpecies(plantComp.speciesId);
      if (hasFruit && isEdible) {
        return { type: 'plant', subtype: 'fruit', entity: plant, position: plantPos, distance };
      }

      const validStages = ['mature', 'seeding', 'senescence'];
      const hasSeeds = plantComp.seedsProduced > 0;
      const isValidStage = validStages.includes(plantComp.stage);
      if (hasSeeds && isValidStage) {
        return { type: 'plant', subtype: 'seeds', entity: plant, position: plantPos, distance };
      }
    }
  }

  return null;
}

/**
 * Calculate work speed from context needs
 */
function calculateWorkSpeedFromContext(ctx: import('../BehaviorContext.js').BehaviorContext): number {
  const { needs } = ctx;
  if (!needs) return 1.0;

  const energy = needs.energy;
  if (energy < ENERGY_CRITICAL) return 0;
  if (energy < ENERGY_LOW) return WORK_SPEED_CRITICAL;
  if (energy < ENERGY_MODERATE) return WORK_SPEED_LOW;
  if (energy < ENERGY_HIGH) return 0.9;
  return 1.0;
}
