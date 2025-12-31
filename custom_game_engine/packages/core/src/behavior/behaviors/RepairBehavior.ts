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
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { SkillsComponent } from '../../components/SkillsComponent.js';
import { ComponentType } from '../../types/ComponentType.js';

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
      return { complete: true, nextBehavior: 'idle', reason: 'missing_components' };
    }

    switch (phase) {
      case 'searching':
        return this.handleSearchingPhase(entity, position, world);
      case 'moving':
        return this.handleMovingPhase(entity, position, world, currentTick);
      case 'repairing':
        return this.handleRepairingPhase(entity, position, inventory, world, currentTick);
      case 'complete':
        return { complete: true, nextBehavior: 'wander', reason: 'repair_complete' };
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
      return { complete: true, nextBehavior: 'wander', reason: 'no_damaged_buildings' };
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

    // Check distance to target
    const dx = targetPosition.x - position.x;
    const dy = targetPosition.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= REPAIR_CONFIG.REPAIR_RANGE) {
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
      return { complete: true, nextBehavior: 'wander', reason: 'repair_timeout' };
    }

    // Get target building
    const building = world.getEntity(targetBuildingId);
    if (!building) {
      return { complete: true, nextBehavior: 'wander', reason: 'building_not_found' };
    }

    const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>(ComponentType.Building);
    if (!buildingComp) {
      return { complete: true, nextBehavior: 'wander', reason: 'building_missing_component' };
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

      return { complete: true, nextBehavior: 'wander', reason: 'repair_complete' };
    }

    // Check distance (may have moved)
    const buildingPos = (building as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);
    if (buildingPos) {
      const dx = buildingPos.x - position.x;
      const dy = buildingPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > REPAIR_CONFIG.REPAIR_RANGE + 1) {
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
    const buildings = world.query()
      .with(ComponentType.Building)
      .with(ComponentType.Position)
      .executeEntities();

    let bestTarget: { id: string; building: BuildingComponent; position: PositionComponent } | null = null;
    let bestScore = -Infinity;

    for (const buildingEntity of buildings) {
      const building = (buildingEntity as EntityImpl).getComponent<BuildingComponent>(ComponentType.Building);
      const position = (buildingEntity as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);

      if (!building || !position) continue;

      // Skip buildings that don't need repair
      if (building.condition >= REPAIR_CONFIG.NEEDS_REPAIR_THRESHOLD) continue;

      // Skip buildings under construction
      if (!building.isComplete) continue;

      // Calculate distance
      const dx = position.x - agentPos.x;
      const dy = position.y - agentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Skip if too far
      if (distance > REPAIR_CONFIG.SEARCH_RADIUS) continue;

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
 */
export function repairBehavior(entity: EntityImpl, world: World): void {
  const behavior = new RepairBehavior();
  behavior.execute(entity, world);
}
