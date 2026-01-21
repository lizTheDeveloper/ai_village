/**
 * RepairBehavior - Agent repairs damaged buildings
 *
 * Part of Phase 41: Autonomous Building System
 *
 * Repair mechanics:
 * - Finds nearest building with low condition
 * - Moves to building location
 * - Repairs building condition over time
 * - Consumes repair materials from inventory
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { Entity } from '../../ecs/Entity.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { SkillsComponent } from '../../components/SkillsComponent.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * ChunkSpatialQuery is now available via world.spatialQuery
 */

/**
 * Repair configuration
 */
const REPAIR_CONFIG = {
  // Condition thresholds
  NEEDS_REPAIR_THRESHOLD: 80, // Condition below which buildings need repair
  CRITICAL_THRESHOLD: 30, // Condition below which repair is urgent

  // Repair rates (condition points per second)
  BASE_REPAIR_RATE: 2.0, // Base repair rate per second
  SKILL_BONUS_MULTIPLIER: 0.5, // Extra rate per building skill level

  // Resource consumption
  REPAIR_MATERIAL_RATE: 0.1, // Materials consumed per condition point restored

  // Movement
  REPAIR_RANGE: 2.0, // Tiles away to repair from
  SEARCH_RADIUS: 30, // How far to look for damaged buildings

  // Duration (safety limit)
  MAX_REPAIR_TICKS: 600, // ~30 seconds max per repair session
};

/**
 * Repair phases
 */
type RepairPhase = 'searching' | 'moving' | 'repairing' | 'complete';

/**
 * RepairBehavior - Maintain building condition
 */
export class RepairBehavior extends BaseBehavior {
  readonly name = 'repair' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const state = this.getState(entity);
    const currentTick = world.tick;
    const phase = (state.phase as RepairPhase) ?? 'searching';

    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);

    if (!agent || !position) {
      throw new Error(`[RepairBehavior] Agent ${entity.id} missing required components: agent=${!!agent}, position=${!!position}`);
    }

    switch (phase) {
      case 'searching':
        return this.handleSearchingPhase(entity, position, world);
      case 'moving':
        return this.handleMovingPhase(entity, position, world, currentTick);
      case 'repairing':
        return this.handleRepairingPhase(entity, position, inventory, world, currentTick);
      case 'complete':
        return { complete: true, reason: 'repair_complete' };
    }
  }

  /**
   * Searching phase - find a damaged building to repair
   */
  private handleSearchingPhase(
    entity: EntityImpl,
    position: PositionComponent,
    world: World
  ): BehaviorResult | void {
    const target = this.findDamagedBuilding(position, world);

    if (!target) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'No buildings need repair.',
      }));
      return { complete: true, reason: 'no_damaged_buildings' };
    }

    // Store target and transition to moving
    this.updateState(entity, {
      phase: 'moving',
      targetBuildingId: target.id,
      targetPosition: { x: target.position.x, y: target.position.y },
    });

    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      lastThought: `Going to repair the ${target.building.buildingType}.`,
    }));
  }

  /**
   * Moving phase - navigate to the damaged building
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

    // Check distance to target (using squared distance for performance)
    const dx = targetPosition.x - position.x;
    const dy = targetPosition.y - position.y;
    const distanceSquared = dx * dx + dy * dy;
    const repairRangeSquared = REPAIR_CONFIG.REPAIR_RANGE * REPAIR_CONFIG.REPAIR_RANGE;

    if (distanceSquared <= repairRangeSquared) {
      // In range - start repairing
      this.disableSteeringAndStop(entity);
      this.updateState(entity, {
        phase: 'repairing',
        repairStarted: currentTick,
      });

      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'Beginning repairs...',
      }));
      return;
    }

    // Move toward target using built-in moveToward
    this.moveToward(entity, targetPosition, { arrivalDistance: REPAIR_CONFIG.REPAIR_RANGE });

    // Check if target building still needs repair
    const building = world.getEntity(targetBuildingId);
    if (!building) {
      this.updateState(entity, { phase: 'searching' });
      return;
    }

    const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>(ComponentType.Building);
    if (!buildingComp || buildingComp.condition >= 100) {
      // Building was repaired by someone else
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'Someone else repaired that building.',
      }));
      this.updateState(entity, { phase: 'searching' });
    }
  }

  /**
   * Repairing phase - actively repair the building
   */
  private handleRepairingPhase(
    entity: EntityImpl,
    position: PositionComponent,
    inventory: InventoryComponent | undefined,
    world: World,
    currentTick: number
  ): BehaviorResult | void {
    this.disableSteeringAndStop(entity);
    const state = this.getState(entity);

    const targetBuildingId = state.targetBuildingId as string;
    const repairStarted = state.repairStarted as number;

    // Safety timeout
    if (currentTick - repairStarted > REPAIR_CONFIG.MAX_REPAIR_TICKS) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'Repair session complete.',
      }));
      return { complete: true, reason: 'repair_timeout' };
    }

    // Get target building
    const building = world.getEntity(targetBuildingId);
    if (!building) {
      return { complete: true, reason: 'building_not_found' };
    }

    const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>(ComponentType.Building);
    if (!buildingComp) {
      return { complete: true, reason: 'building_missing_component' };
    }

    // Check if repair is complete
    if (buildingComp.condition >= 100) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'Repairs complete!',
      }));

      // Emit repair complete event (using generic event type for extensibility)
      world.eventBus.emit({
        type: 'action:completed',
        source: 'repair_behavior',
        data: {
          actionType: 'repair',
          actionId: `repair_${targetBuildingId}`,
          agentId: entity.id,
        },
      });

      return { complete: true, reason: 'repair_complete' };
    }

    // Check distance (may have moved) - using squared distance for performance
    const buildingPos = (building as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);
    if (buildingPos) {
      const dx = buildingPos.x - position.x;
      const dy = buildingPos.y - position.y;
      const distanceSquared = dx * dx + dy * dy;
      const maxRangeSquared = (REPAIR_CONFIG.REPAIR_RANGE + 1) * (REPAIR_CONFIG.REPAIR_RANGE + 1);
      if (distanceSquared > maxRangeSquared) {
        this.updateState(entity, { phase: 'moving' });
        return;
      }
    }

    // Calculate repair rate based on skills
    const skills = entity.getComponent<SkillsComponent>(ComponentType.Skills);
    const buildingSkill = skills?.levels?.building ?? 0;
    const repairRate = REPAIR_CONFIG.BASE_REPAIR_RATE +
      (buildingSkill * REPAIR_CONFIG.SKILL_BONUS_MULTIPLIER);

    // Check if we have repair materials (wood or stone)
    const hasRepairMaterials = this.checkAndConsumeRepairMaterials(entity, inventory, 1);

    // Apply repair (slower without materials)
    const actualRepairRate = hasRepairMaterials ? repairRate : repairRate * 0.3;
    const deltaTime = 1 / 20; // Assume 20 TPS
    const conditionIncrease = actualRepairRate * deltaTime;

    (building as EntityImpl).updateComponent<BuildingComponent>(ComponentType.Building, (comp) => ({
      ...comp,
      condition: Math.min(100, comp.condition + conditionIncrease),
    }));

    // Periodic thoughts
    const lastThoughtTick = (state.lastThoughtTick as number) ?? 0;
    if (currentTick - lastThoughtTick > 100) {
      const progress = Math.round(buildingComp.condition);
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: `Repairing... ${progress}% condition.`,
      }));
      this.updateState(entity, { lastThoughtTick: currentTick });
    }
  }

  /**
   * Find a damaged building to repair
   */
  private findDamagedBuilding(
    agentPos: PositionComponent,
    world: World
  ): { id: string; building: BuildingComponent; position: PositionComponent } | null {
    let buildings: readonly Entity[];

    if (world.spatialQuery) {
      // Fast: chunk-based spatial query
      const buildingsInRadius = world.spatialQuery.getEntitiesInRadius(
        agentPos.x,
        agentPos.y,
        REPAIR_CONFIG.SEARCH_RADIUS,
        [ComponentType.Building]
      );
      buildings = buildingsInRadius.map((result: { entity: Entity }) => result.entity);
    } else {
      // Fallback: global query
      buildings = world.query()
        .with(ComponentType.Building)
        .with(ComponentType.Position)
        .executeEntities();
    }

    let bestTarget: { id: string; building: BuildingComponent; position: PositionComponent } | null = null;
    let bestScore = -Infinity;

    const searchRadiusSquared = REPAIR_CONFIG.SEARCH_RADIUS * REPAIR_CONFIG.SEARCH_RADIUS;

    for (const buildingEntity of buildings) {
      const building = (buildingEntity as EntityImpl).getComponent<BuildingComponent>(ComponentType.Building);
      const position = (buildingEntity as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);

      if (!building || !position) continue;

      // Skip buildings that don't need repair
      if (building.condition >= REPAIR_CONFIG.NEEDS_REPAIR_THRESHOLD) continue;

      // Skip buildings under construction
      if (!building.isComplete) continue;

      // Calculate distance using squared distance for performance
      const dx = position.x - agentPos.x;
      const dy = position.y - agentPos.y;
      const distanceSquared = dx * dx + dy * dy;

      // Skip if too far
      if (distanceSquared > searchRadiusSquared) continue;

      // Use squared distance directly in scoring to avoid sqrt
      const distance = Math.sqrt(distanceSquared);

      // Score: prioritize lower condition and closer distance (using actual distance for scoring)
      // Critical buildings get bonus
      const urgencyBonus = building.condition < REPAIR_CONFIG.CRITICAL_THRESHOLD ? 50 : 0;
      const score = (100 - building.condition) + urgencyBonus - (distance * 2);

      if (score > bestScore) {
        bestScore = score;
        bestTarget = { id: buildingEntity.id, building, position };
      }
    }

    return bestTarget;
  }

  /**
   * Check and consume repair materials from inventory
   * Returns true if materials were consumed
   */
  private checkAndConsumeRepairMaterials(
    entity: EntityImpl,
    inventory: InventoryComponent | undefined,
    _amount: number
  ): boolean {
    if (!inventory) return false;

    // Look for repair materials (wood, stone, or specialized repair items)
    const repairMaterials = ['wood', 'stone', 'repair_kit'];

    for (const slot of inventory.slots) {
      if (slot.itemId && repairMaterials.includes(slot.itemId) && slot.quantity > 0) {
        // Consume material occasionally (not every tick)
        const consumeChance = REPAIR_CONFIG.REPAIR_MATERIAL_RATE / 20; // Per tick
        if (Math.random() < consumeChance) {
          entity.updateComponent<InventoryComponent>(ComponentType.Inventory, (inv) => {
            const updatedSlots = inv.slots.map(s => {
              if (s.itemId === slot.itemId && s.quantity > 0) {
                return { ...s, quantity: s.quantity - 1 };
              }
              return s;
            });
            return { ...inv, slots: updatedSlots };
          });
        }
        return true;
      }
    }

    return false;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 * @deprecated Use repairBehaviorWithContext instead for better performance
 */
export function repairBehavior(entity: EntityImpl, world: World): void {
  const behavior = new RepairBehavior();
  behavior.execute(entity, world);
}

// ============================================================================
// Modern BehaviorContext Implementation
// ============================================================================

import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('repair', repairBehaviorWithContext);
 */
export function repairBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  const state = ctx.getAllState();
  const phase = (state.phase as RepairPhase) ?? 'searching';

  switch (phase) {
    case 'searching':
      return handleSearchingPhaseCtx(ctx, state);
    case 'moving':
      return handleMovingPhaseCtx(ctx, state);
    case 'repairing':
      return handleRepairingPhaseCtx(ctx, state);
    case 'complete':
      return ctx.complete('repair_complete');
  }
}

function handleSearchingPhaseCtx(ctx: BehaviorContext, _state: Record<string, unknown>): ContextBehaviorResult | void {
  const target = findDamagedBuildingCtx(ctx);

  if (!target) {
    ctx.setThought('No buildings need repair.');
    return ctx.complete('no_damaged_buildings');
  }

  // Store target and transition to moving
  ctx.updateState({
    phase: 'moving',
    targetBuildingId: target.id,
    targetPosition: { x: target.position.x, y: target.position.y },
  });

  ctx.setThought(`Going to repair the ${target.building.buildingType}.`);
}

function handleMovingPhaseCtx(ctx: BehaviorContext, state: Record<string, unknown>): ContextBehaviorResult | void {
  const targetPosition = state.targetPosition as { x: number; y: number };
  const targetBuildingId = state.targetBuildingId as string;

  if (!targetPosition || !targetBuildingId) {
    ctx.updateState({ phase: 'searching' });
    return;
  }

  // Check distance to target (using squared distance)
  if (ctx.isWithinRange(targetPosition, REPAIR_CONFIG.REPAIR_RANGE)) {
    // In range - start repairing
    ctx.stopMovement();
    ctx.updateState({
      phase: 'repairing',
      repairStarted: ctx.tick,
    });

    ctx.setThought('Beginning repairs...');
    return;
  }

  // Move toward target
  ctx.moveToward(targetPosition, { arrivalDistance: REPAIR_CONFIG.REPAIR_RANGE });

  // Check if target building still needs repair
  const building = ctx.getEntity(targetBuildingId);
  if (!building) {
    ctx.updateState({ phase: 'searching' });
    return;
  }

  const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>(CT.Building);
  if (!buildingComp || buildingComp.condition >= 100) {
    // Building was repaired by someone else
    ctx.setThought('Someone else repaired that building.');
    ctx.updateState({ phase: 'searching' });
  }
}

function handleRepairingPhaseCtx(ctx: BehaviorContext, state: Record<string, unknown>): ContextBehaviorResult | void {
  ctx.stopMovement();

  const targetBuildingId = state.targetBuildingId as string;
  const repairStarted = state.repairStarted as number;

  // Safety timeout
  if (ctx.tick - repairStarted > REPAIR_CONFIG.MAX_REPAIR_TICKS) {
    ctx.setThought('Repair session complete.');
    return ctx.complete('repair_timeout');
  }

  // Get target building
  const building = ctx.getEntity(targetBuildingId);
  if (!building) {
    return ctx.complete('building_not_found');
  }

  const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>(CT.Building);
  if (!buildingComp) {
    return ctx.complete('building_missing_component');
  }

  // Check if repair is complete
  if (buildingComp.condition >= 100) {
    ctx.setThought('Repairs complete!');

    // Emit repair complete event
    ctx.emit({
      type: 'action:completed',
      source: 'repair_behavior',
      data: {
        actionType: 'repair',
        actionId: `repair_${targetBuildingId}`,
        agentId: ctx.entity.id,
      },
    });

    return ctx.complete('repair_complete');
  }

  // Check distance (may have moved)
  const buildingPos = (building as EntityImpl).getComponent<PositionComponent>(CT.Position);
  if (buildingPos) {
    if (!ctx.isWithinRange(buildingPos, REPAIR_CONFIG.REPAIR_RANGE + 1)) {
      ctx.updateState({ phase: 'moving' });
      return;
    }
  }

  // Calculate repair rate based on skills
  const skills = ctx.getComponent<SkillsComponent>(CT.Skills);
  const buildingSkill = skills?.levels?.building ?? 0;
  const repairRate = REPAIR_CONFIG.BASE_REPAIR_RATE +
    (buildingSkill * REPAIR_CONFIG.SKILL_BONUS_MULTIPLIER);

  // Check if we have repair materials
  const hasRepairMaterials = checkRepairMaterials(ctx.inventory);

  // Apply repair (slower without materials)
  const actualRepairRate = hasRepairMaterials ? repairRate : repairRate * 0.3;
  const deltaTime = 1 / 20; // Assume 20 TPS
  const conditionIncrease = actualRepairRate * deltaTime;

  (building as EntityImpl).updateComponent<BuildingComponent>(CT.Building, (comp) => ({
    ...comp,
    condition: Math.min(100, comp.condition + conditionIncrease),
  }));

  // Consume materials occasionally if we have them
  if (hasRepairMaterials && ctx.inventory) {
    consumeRepairMaterialsCtx(ctx);
  }

  // Periodic thoughts
  const lastThoughtTick = (state.lastThoughtTick as number) ?? 0;
  if (ctx.tick - lastThoughtTick > 100) {
    const progress = Math.round(buildingComp.condition);
    ctx.setThought(`Repairing... ${progress}% condition.`);
    ctx.updateState({ lastThoughtTick: ctx.tick });
  }
}

function findDamagedBuildingCtx(
  ctx: BehaviorContext
): { id: string; building: BuildingComponent; position: PositionComponent } | null {
  // Use context's spatial query (automatically uses ChunkSpatialQuery if available)
  const buildings = ctx.getEntitiesInRadius(REPAIR_CONFIG.SEARCH_RADIUS, [CT.Building, CT.Position]);

  let bestTarget: { id: string; building: BuildingComponent; position: PositionComponent } | null = null;
  let bestScore = -Infinity;

  for (const { entity: buildingEntity, position: pos, distance } of buildings) {
    const building = (buildingEntity as EntityImpl).getComponent<BuildingComponent>(CT.Building);
    const position = (buildingEntity as EntityImpl).getComponent<PositionComponent>(CT.Position);

    if (!building || !position) continue;

    // Skip buildings that don't need repair
    if (building.condition >= REPAIR_CONFIG.NEEDS_REPAIR_THRESHOLD) continue;

    // Skip buildings under construction
    if (!building.isComplete) continue;

    // Score: prioritize lower condition and closer distance
    // Critical buildings get bonus
    const urgencyBonus = building.condition < REPAIR_CONFIG.CRITICAL_THRESHOLD ? 50 : 0;
    const score = (100 - building.condition) + urgencyBonus - (distance * 2);

    if (score > bestScore) {
      bestScore = score;
      bestTarget = { id: buildingEntity.id, building, position };
    }
  }

  return bestTarget;
}

function checkRepairMaterials(inventory: InventoryComponent | null): boolean {
  if (!inventory) return false;

  const repairMaterials = ['wood', 'stone', 'repair_kit'];

  for (const slot of inventory.slots) {
    if (slot.itemId && repairMaterials.includes(slot.itemId) && slot.quantity > 0) {
      return true;
    }
  }

  return false;
}

function consumeRepairMaterialsCtx(ctx: BehaviorContext): void {
  if (!ctx.inventory) return;

  const repairMaterials = ['wood', 'stone', 'repair_kit'];
  const consumeChance = REPAIR_CONFIG.REPAIR_MATERIAL_RATE / 20; // Per tick

  if (Math.random() >= consumeChance) return;

  ctx.updateComponent<InventoryComponent>(CT.Inventory, (inv) => {
    const updatedSlots = inv.slots.map(s => {
      if (s.itemId && repairMaterials.includes(s.itemId) && s.quantity > 0) {
        return { ...s, quantity: s.quantity - 1 };
      }
      return s;
    });
    return { ...inv, slots: updatedSlots };
  });
}
