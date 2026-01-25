/**
 * UpgradeBehavior - Agent upgrades buildings to higher tiers
 *
 * Part of Phase 41: Autonomous Building System
 *
 * Upgrade mechanics:
 * - Finds completed buildings that can be upgraded
 * - Checks for required resources
 * - Upgrades building tier (1 -> 2 -> 3)
 * - Higher tiers provide better bonuses
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { SkillsComponent } from '../../components/SkillsComponent.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * Upgrade configuration
 */
const UPGRADE_CONFIG = {
  // Maximum tier
  MAX_TIER: 3,

  // Upgrade rates (tier progress per second)
  BASE_UPGRADE_RATE: 1.5, // Base rate per second
  SKILL_BONUS_MULTIPLIER: 0.3, // Extra rate per building skill level

  // Movement
  UPGRADE_RANGE: 2.0, // Tiles away to upgrade from
  SEARCH_RADIUS: 40, // How far to look for upgradeable buildings

  // Duration (ticks for full upgrade)
  UPGRADE_DURATION: 400, // ~20 seconds per tier upgrade

  // Minimum condition for upgrade
  MIN_CONDITION_FOR_UPGRADE: 60,
};

/**
 * Upgrade resource requirements by building type and target tier
 */
const UPGRADE_COSTS: Record<string, Record<number, Record<string, number>>> = {
  // Tier 1 -> 2
  'workbench': {
    2: { wood: 30, stone: 10 },
    3: { wood: 50, stone: 20, iron: 10 },
  },
  'storage-chest': {
    2: { wood: 15, iron: 5 },
    3: { wood: 25, iron: 15 },
  },
  'campfire': {
    2: { stone: 10, wood: 5 },
    3: { stone: 20, iron: 5 },
  },
  'tent': {
    2: { wood: 15, cloth: 5 },
    3: { wood: 30, cloth: 15, leather: 5 },
  },
  'well': {
    2: { stone: 30 },
    3: { stone: 50, iron: 10 },
  },
  'forge': {
    2: { stone: 40, iron: 20 },
    3: { stone: 60, iron: 40, coal: 20 },
  },
  // Default for unlisted buildings
  'default': {
    2: { wood: 20, stone: 10 },
    3: { wood: 40, stone: 20, iron: 10 },
  },
};

/**
 * Upgrade phases
 */
type UpgradePhase = 'searching' | 'moving' | 'upgrading' | 'complete';

/**
 * Upgrade behavior state structure
 */
interface UpgradeState {
  phase?: UpgradePhase;
  targetBuildingId?: string;
  targetPosition?: { x: number; y: number };
  targetTier?: number;
  upgradeStarted?: number;
  upgradeProgress?: number;
  lastThoughtTick?: number;
}

/**
 * UpgradeBehavior - Improve building tiers
 */
export class UpgradeBehavior extends BaseBehavior {
  readonly name = 'upgrade' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const state = this.getState(entity);
    const currentTick = world.tick;
    const phase = (state.phase as UpgradePhase) ?? 'searching';

    const agent = entity.getComponent(ComponentType.Agent);
    const position = entity.getComponent(ComponentType.Position);
    const inventory = entity.getComponent(ComponentType.Inventory);

    if (!agent || !position) {
      throw new Error(`[UpgradeBehavior] Agent ${entity.id} missing required components: agent=${!!agent}, position=${!!position}`);
    }

    switch (phase) {
      case 'searching':
        return this.handleSearchingPhase(entity, position, inventory, world);
      case 'moving':
        return this.handleMovingPhase(entity, position, world, currentTick);
      case 'upgrading':
        return this.handleUpgradingPhase(entity, position, world, currentTick);
      case 'complete':
        return { complete: true, reason: 'upgrade_complete' };
    }
  }

  /**
   * Searching phase - find a building to upgrade
   */
  private handleSearchingPhase(
    entity: EntityImpl,
    position: PositionComponent,
    inventory: InventoryComponent | undefined,
    world: World
  ): BehaviorResult | void {
    const target = this.findUpgradeableBuilding(position, inventory, world);

    if (!target) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'No buildings ready for upgrade.',
      }));
      return { complete: true, reason: 'no_upgradeable_buildings' };
    }

    // Store target and transition to moving
    this.updateState(entity, {
      phase: 'moving',
      targetBuildingId: target.id,
      targetPosition: { x: target.position.x, y: target.position.y },
      targetTier: target.building.tier + 1,
    });

    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      lastThought: `Going to upgrade ${target.building.buildingType} to tier ${target.building.tier + 1}.`,
    }));
  }

  /**
   * Moving phase - navigate to the target building
   */
  private handleMovingPhase(
    entity: EntityImpl,
    position: PositionComponent,
    world: World,
    currentTick: number
  ): BehaviorResult | void {
    const state = this.getState(entity);
    const targetPosition = state.targetPosition as { x: number; y: number };
    const targetBuildingId = state.targetBuildingId as string;

    if (!targetPosition || !targetBuildingId) {
      this.updateState(entity, { phase: 'searching' });
      return;
    }

    // Check distance to target
    const dx = targetPosition.x - position.x;
    const dy = targetPosition.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= UPGRADE_CONFIG.UPGRADE_RANGE) {
      // In range - start upgrading
      this.disableSteeringAndStop(entity);
      this.updateState(entity, {
        phase: 'upgrading',
        upgradeStarted: currentTick,
        upgradeProgress: 0,
      });

      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'Beginning upgrade work...',
      }));
      return;
    }

    // Move toward target using built-in moveToward
    this.moveToward(entity, targetPosition, { arrivalDistance: UPGRADE_CONFIG.UPGRADE_RANGE });

    // Check if target building still exists and can be upgraded
    const building = world.getEntity(targetBuildingId);
    if (!building) {
      this.updateState(entity, { phase: 'searching' });
      return;
    }

    const buildingComp = (building as EntityImpl).getComponent(ComponentType.Building);
    if (!buildingComp || buildingComp.tier >= UPGRADE_CONFIG.MAX_TIER) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'That building was already upgraded.',
      }));
      this.updateState(entity, { phase: 'searching' });
    }
  }

  /**
   * Upgrading phase - actively upgrade the building
   */
  private handleUpgradingPhase(
    entity: EntityImpl,
    position: PositionComponent,
    world: World,
    currentTick: number
  ): BehaviorResult | void {
    this.disableSteeringAndStop(entity);
    const state = this.getState(entity);

    const targetBuildingId = state.targetBuildingId as string;
    const upgradeStarted = state.upgradeStarted as number;
    const targetTier = state.targetTier as number;

    // Get target building
    const building = world.getEntity(targetBuildingId);
    if (!building) {
      return { complete: true, reason: 'building_not_found' };
    }

    const buildingComp = (building as EntityImpl).getComponent(ComponentType.Building);
    if (!buildingComp) {
      return { complete: true, reason: 'building_missing_component' };
    }

    // Check distance
    const buildingPos = (building as EntityImpl).getComponent(ComponentType.Position);
    if (buildingPos) {
      const dx = buildingPos.x - position.x;
      const dy = buildingPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > UPGRADE_CONFIG.UPGRADE_RANGE + 1) {
        this.updateState(entity, { phase: 'moving' });
        return;
      }
    }

    // Calculate upgrade progress based on time
    const elapsed = currentTick - upgradeStarted;
    const skills = entity.getComponent(ComponentType.Skills);
    const buildingSkill = skills?.levels?.building ?? 0;
    const speedMultiplier = 1 + (buildingSkill * UPGRADE_CONFIG.SKILL_BONUS_MULTIPLIER);

    const adjustedDuration = UPGRADE_CONFIG.UPGRADE_DURATION / speedMultiplier;
    const progress = Math.min(100, (elapsed / adjustedDuration) * 100);

    // Check if upgrade is complete
    if (progress >= 100) {
      // Consume resources
      const inventory = entity.getComponent(ComponentType.Inventory);
      const cost = this.getUpgradeCost(buildingComp.buildingType, targetTier);

      if (inventory && cost) {
        this.consumeResources(entity, inventory, cost);
      }

      // Apply upgrade
      (building as EntityImpl).updateComponent<BuildingComponent>(ComponentType.Building, (comp) => ({
        ...comp,
        tier: targetTier,
        // Improve building properties based on tier
        storageCapacity: Math.floor(comp.storageCapacity * (1 + 0.5 * (targetTier - comp.tier))),
        heatRadius: Math.floor(comp.heatRadius * (1 + 0.3 * (targetTier - comp.tier))),
        insulation: Math.min(1, comp.insulation + 0.1 * (targetTier - comp.tier)),
      }));

      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: `Upgrade complete! ${buildingComp.buildingType} is now tier ${targetTier}!`,
      }));

      // Emit upgrade complete event (using generic event type for extensibility)
      world.eventBus.emit({
        type: 'action:completed',
        source: 'upgrade_behavior',
        data: {
          actionType: 'upgrade',
          actionId: `upgrade_${targetBuildingId}`,
          agentId: entity.id,
        },
      });

      return { complete: true, reason: 'upgrade_complete' };
    }

    // Update progress thoughts periodically
    const lastThoughtTick = (state.lastThoughtTick as number) ?? 0;
    if (currentTick - lastThoughtTick > 80) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: `Upgrading... ${Math.round(progress)}% complete.`,
      }));
      this.updateState(entity, { lastThoughtTick: currentTick });
    }
  }

  /**
   * Find a building that can be upgraded
   */
  private findUpgradeableBuilding(
    agentPos: PositionComponent,
    inventory: InventoryComponent | undefined,
    world: World
  ): { id: string; building: BuildingComponent; position: PositionComponent } | null {
    const buildings = world.query()
      .with(ComponentType.Building)
      .with(ComponentType.Position)
      .executeEntities();

    // Get available resources
    const availableResources = this.getInventoryResources(inventory);

    let bestTarget: { id: string; building: BuildingComponent; position: PositionComponent } | null = null;
    let bestScore = -Infinity;

    for (const buildingEntity of buildings) {
      const building = (buildingEntity as EntityImpl).getComponent(ComponentType.Building);
      const position = (buildingEntity as EntityImpl).getComponent(ComponentType.Position);

      if (!building || !position) continue;

      // Skip buildings at max tier
      if (building.tier >= UPGRADE_CONFIG.MAX_TIER) continue;

      // Skip incomplete buildings
      if (!building.isComplete) continue;

      // Skip buildings in poor condition
      if (building.condition < UPGRADE_CONFIG.MIN_CONDITION_FOR_UPGRADE) continue;

      // Check if we have resources for upgrade
      const targetTier = building.tier + 1;
      const cost = this.getUpgradeCost(building.buildingType, targetTier);
      if (!this.hasResources(availableResources, cost)) continue;

      // Calculate distance
      const dx = position.x - agentPos.x;
      const dy = position.y - agentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Skip if too far
      if (distance > UPGRADE_CONFIG.SEARCH_RADIUS) continue;

      // Score: prioritize lower tier buildings and closer distance
      const tierScore = (UPGRADE_CONFIG.MAX_TIER - building.tier) * 20;
      const score = tierScore - distance;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = { id: buildingEntity.id, building, position };
      }
    }

    return bestTarget;
  }

  /**
   * Get upgrade cost for a building type and target tier
   */
  private getUpgradeCost(buildingType: string, targetTier: number): Record<string, number> {
    const buildingCosts = UPGRADE_COSTS[buildingType] ?? UPGRADE_COSTS['default'];
    return buildingCosts?.[targetTier] ?? {};
  }

  /**
   * Get resources from inventory
   */
  private getInventoryResources(inventory: InventoryComponent | undefined): Record<string, number> {
    const resources: Record<string, number> = {};
    if (!inventory) return resources;

    for (const slot of inventory.slots) {
      if (slot.itemId && slot.quantity > 0) {
        resources[slot.itemId] = (resources[slot.itemId] ?? 0) + slot.quantity;
      }
    }

    return resources;
  }

  /**
   * Check if we have enough resources
   */
  private hasResources(available: Record<string, number>, required: Record<string, number>): boolean {
    for (const [resource, amount] of Object.entries(required)) {
      if ((available[resource] ?? 0) < amount) {
        return false;
      }
    }
    return true;
  }

  /**
   * Consume resources from inventory
   */
  private consumeResources(
    entity: EntityImpl,
    _inventory: InventoryComponent,
    cost: Record<string, number>
  ): void {
    const remaining = { ...cost };

    entity.updateComponent<InventoryComponent>(ComponentType.Inventory, (inv) => {
      const updatedSlots = inv.slots.map(slot => {
        if (!slot.itemId || slot.quantity <= 0) return slot;

        const needed = remaining[slot.itemId] ?? 0;
        if (needed <= 0) return slot;

        const toConsume = Math.min(slot.quantity, needed);
        remaining[slot.itemId] = needed - toConsume;

        return {
          ...slot,
          quantity: slot.quantity - toConsume,
          itemId: slot.quantity - toConsume > 0 ? slot.itemId : null,
        };
      });

      return { ...inv, slots: updatedSlots };
    });
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 * @deprecated Use upgradeBehaviorWithContext instead for better performance
 */
export function upgradeBehavior(entity: EntityImpl, world: World): void {
  const behavior = new UpgradeBehavior();
  behavior.execute(entity, world);
}

// ============================================================================
// Modern BehaviorContext Implementation
// ============================================================================

import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('upgrade', upgradeBehaviorWithContext);
 */
export function upgradeBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  const state = ctx.getAllState() as UpgradeState;
  const phase = state.phase ?? 'searching';

  switch (phase) {
    case 'searching':
      return handleUpgradeSearching(ctx, state);
    case 'moving':
      return handleUpgradeMoving(ctx, state);
    case 'upgrading':
      return handleUpgrading(ctx, state);
    case 'complete':
      return ctx.complete('upgrade_complete');
  }
}

function handleUpgradeSearching(ctx: BehaviorContext, _state: UpgradeState): ContextBehaviorResult | void {
  const target = findUpgradeableBuildingCtx(ctx);

  if (!target) {
    ctx.setThought('No buildings ready for upgrade.');
    return ctx.complete('no_upgradeable_buildings');
  }

  // Store target and transition to moving
  ctx.updateState({
    phase: 'moving',
    targetBuildingId: target.id,
    targetPosition: { x: target.position.x, y: target.position.y },
    targetTier: target.building.tier + 1,
  });

  ctx.setThought(`Going to upgrade ${target.building.buildingType} to tier ${target.building.tier + 1}.`);
}

function handleUpgradeMoving(ctx: BehaviorContext, state: UpgradeState): ContextBehaviorResult | void {
  const targetPosition = state.targetPosition as { x: number; y: number };
  const targetBuildingId = state.targetBuildingId as string;

  if (!targetPosition || !targetBuildingId) {
    ctx.updateState({ phase: 'searching' });
    return;
  }

  // Check if in range
  if (ctx.isWithinRange(targetPosition, UPGRADE_CONFIG.UPGRADE_RANGE)) {
    // In range - start upgrading
    ctx.stopMovement();
    ctx.updateState({
      phase: 'upgrading',
      upgradeStarted: ctx.tick,
      upgradeProgress: 0,
    });

    ctx.setThought('Beginning upgrade work...');
    return;
  }

  // Move toward target
  ctx.moveToward(targetPosition, { arrivalDistance: UPGRADE_CONFIG.UPGRADE_RANGE });

  // Check if target building still exists and can be upgraded
  const building = ctx.getEntity(targetBuildingId);
  if (!building) {
    ctx.updateState({ phase: 'searching' });
    return;
  }

  const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>(CT.Building);
  if (!buildingComp || buildingComp.tier >= UPGRADE_CONFIG.MAX_TIER) {
    ctx.setThought('That building was already upgraded.');
    ctx.updateState({ phase: 'searching' });
  }
}

function handleUpgrading(ctx: BehaviorContext, state: UpgradeState): ContextBehaviorResult | void {
  ctx.stopMovement();

  const targetBuildingId = state.targetBuildingId as string;
  const upgradeStarted = state.upgradeStarted as number;
  const targetTier = state.targetTier as number;

  // Get target building
  const building = ctx.getEntity(targetBuildingId);
  if (!building) {
    return ctx.complete('building_not_found');
  }

  const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>(CT.Building);
  if (!buildingComp) {
    return ctx.complete('building_missing_component');
  }

  // Check distance
  const buildingPos = (building as EntityImpl).getComponent<PositionComponent>(CT.Position);
  if (buildingPos) {
    if (!ctx.isWithinRange(buildingPos, UPGRADE_CONFIG.UPGRADE_RANGE + 1)) {
      ctx.updateState({ phase: 'moving' });
      return;
    }
  }

  // Calculate upgrade progress based on time
  const elapsed = ctx.tick - upgradeStarted;
  const skills = ctx.getComponent<SkillsComponent>(CT.Skills);
  const buildingSkill = skills?.levels?.building ?? 0;
  const speedMultiplier = 1 + (buildingSkill * UPGRADE_CONFIG.SKILL_BONUS_MULTIPLIER);

  const adjustedDuration = UPGRADE_CONFIG.UPGRADE_DURATION / speedMultiplier;
  const progress = Math.min(100, (elapsed / adjustedDuration) * 100);

  // Check if upgrade is complete
  if (progress >= 100) {
    // Consume resources
    const cost = getUpgradeCostForType(buildingComp.buildingType, targetTier);

    if (ctx.inventory && cost) {
      consumeResourcesCtx(ctx, cost);
    }

    // Apply upgrade
    (building as EntityImpl).updateComponent<BuildingComponent>(CT.Building, (comp) => ({
      ...comp,
      tier: targetTier,
      // Improve building properties based on tier
      storageCapacity: Math.floor(comp.storageCapacity * (1 + 0.5 * (targetTier - comp.tier))),
      heatRadius: Math.floor(comp.heatRadius * (1 + 0.3 * (targetTier - comp.tier))),
      insulation: Math.min(1, comp.insulation + 0.1 * (targetTier - comp.tier)),
    }));

    ctx.setThought(`Upgrade complete! ${buildingComp.buildingType} is now tier ${targetTier}!`);

    // Emit upgrade complete event
    ctx.emit({
      type: 'action:completed',
      source: 'upgrade_behavior',
      data: {
        actionType: 'upgrade',
        actionId: `upgrade_${targetBuildingId}`,
        agentId: ctx.entity.id,
      },
    });

    return ctx.complete('upgrade_complete');
  }

  // Update progress thoughts periodically
  const lastThoughtTick = (state.lastThoughtTick as number) ?? 0;
  if (ctx.tick - lastThoughtTick > 80) {
    ctx.setThought(`Upgrading... ${Math.round(progress)}% complete.`);
    ctx.updateState({ lastThoughtTick: ctx.tick });
  }
}

function findUpgradeableBuildingCtx(
  ctx: BehaviorContext
): { id: string; building: BuildingComponent; position: PositionComponent } | null {
  const buildings = ctx.getEntitiesInRadius(UPGRADE_CONFIG.SEARCH_RADIUS, [CT.Building, CT.Position]);

  // Get available resources
  const availableResources = getInventoryResourcesFromCtx(ctx.inventory);

  let bestTarget: { id: string; building: BuildingComponent; position: PositionComponent } | null = null;
  let bestScore = -Infinity;

  for (const { entity: buildingEntity, distance } of buildings) {
    const building = (buildingEntity as EntityImpl).getComponent<BuildingComponent>(CT.Building);
    const position = (buildingEntity as EntityImpl).getComponent<PositionComponent>(CT.Position);

    if (!building || !position) continue;

    // Skip buildings at max tier
    if (building.tier >= UPGRADE_CONFIG.MAX_TIER) continue;

    // Skip incomplete buildings
    if (!building.isComplete) continue;

    // Skip buildings in poor condition
    if (building.condition < UPGRADE_CONFIG.MIN_CONDITION_FOR_UPGRADE) continue;

    // Check if we have resources for upgrade
    const targetTier = building.tier + 1;
    const cost = getUpgradeCostForType(building.buildingType, targetTier);
    if (!hasResourcesForUpgrade(availableResources, cost)) continue;

    // Score: prioritize lower tier buildings and closer distance
    const tierScore = (UPGRADE_CONFIG.MAX_TIER - building.tier) * 20;
    const score = tierScore - distance;

    if (score > bestScore) {
      bestScore = score;
      bestTarget = { id: buildingEntity.id, building, position };
    }
  }

  return bestTarget;
}

function getUpgradeCostForType(buildingType: string, targetTier: number): Record<string, number> {
  const buildingCosts = UPGRADE_COSTS[buildingType] ?? UPGRADE_COSTS['default'];
  return buildingCosts?.[targetTier] ?? {};
}

function getInventoryResourcesFromCtx(inventory: InventoryComponent | null): Record<string, number> {
  const resources: Record<string, number> = {};
  if (!inventory) return resources;

  for (const slot of inventory.slots) {
    if (slot.itemId && slot.quantity > 0) {
      resources[slot.itemId] = (resources[slot.itemId] ?? 0) + slot.quantity;
    }
  }

  return resources;
}

function hasResourcesForUpgrade(available: Record<string, number>, required: Record<string, number>): boolean {
  for (const [resource, amount] of Object.entries(required)) {
    if ((available[resource] ?? 0) < amount) {
      return false;
    }
  }
  return true;
}

function consumeResourcesCtx(ctx: BehaviorContext, cost: Record<string, number>): void {
  const remaining = { ...cost };

  ctx.updateComponent<InventoryComponent>(CT.Inventory, (inv) => {
    const updatedSlots = inv.slots.map(slot => {
      if (!slot.itemId || slot.quantity <= 0) return slot;

      const needed = remaining[slot.itemId] ?? 0;
      if (needed <= 0) return slot;

      const toConsume = Math.min(slot.quantity, needed);
      remaining[slot.itemId] = needed - toConsume;

      return {
        ...slot,
        quantity: slot.quantity - toConsume,
        itemId: slot.quantity - toConsume > 0 ? slot.itemId : null,
      };
    });

    return { ...inv, slots: updatedSlots };
  });
}
