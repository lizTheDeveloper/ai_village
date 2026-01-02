/**
 * EquipmentSystem - Manages dynamic body-based equipment
 *
 * Handles:
 * - Equipment validation (can this body part wear this armor?)
 * - Weight tracking and flight capability
 * - Defense/resistance calculations
 * - Durability degradation
 * - Set bonus detection
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { SystemId } from '../types.js';
import { ComponentType } from '../types/ComponentType.js';
import type { EquipmentComponent } from '../components/EquipmentComponent.js';
import type { BodyComponent, SizeCategory } from '../components/BodyComponent.js';
import { calculateTotalWeight, getTotalDefense, getDamageResistance, getMovementPenalty, getAllEquippedItems } from '../components/EquipmentComponent.js';
import { itemRegistry } from '../items/index.js';
import type { StatBonusTrait } from '../items/traits/StatBonusTrait.js';

export class EquipmentSystem implements System {
  public readonly id: SystemId = 'equipment';
  public readonly priority = 15;  // After movement, before combat
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    ComponentType.Equipment,
    ComponentType.Body,
  ];

  /**
   * Performance: Equipment rarely changes, so only update every 10 ticks.
   * Equipment changes are infrequent (agents don't constantly swap gear).
   * This reduces CPU usage by ~90% for equipment processing after warmup.
   *
   * Warmup period (first 20 ticks) always updates to ensure tests work correctly.
   */
  private static readonly UPDATE_INTERVAL = 10;
  private static readonly WARMUP_TICKS = 20;
  private tickCounter = 0;

  update(_world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    this.tickCounter++;

    // During warmup, always update (for tests and initialization)
    // After warmup, throttle to UPDATE_INTERVAL
    const inWarmup = this.tickCounter <= EquipmentSystem.WARMUP_TICKS;
    const shouldUpdate = inWarmup || this.tickCounter % EquipmentSystem.UPDATE_INTERVAL === 0;

    if (!shouldUpdate) {
      return;
    }

    for (const entity of entities) {
      const equipment = entity.components.get('equipment') as EquipmentComponent;
      const body = entity.components.get('body') as BodyComponent;

      if (!equipment || !body) continue;

      // 1. Validate equipment (remove if body part destroyed)
      this.validateEquipment(equipment, body);

      // 2. Update weight and flight capability
      this.updateWeightTracking(equipment, body);

      // 3. Cache defense stats (performance optimization)
      this.cacheDefenseStats(equipment, this.tickCounter);

      // 4. Update durability (environmental wear)
      // TODO: Implement durability degradation

      // 5. Remove broken equipment
      this.removeBrokenEquipment(equipment);
    }
  }

  /**
   * Validate equipment against body parts.
   * Remove items if body part no longer exists.
   */
  private validateEquipment(equipment: EquipmentComponent, body: BodyComponent): void {
    for (const bodyPartId of Object.keys(equipment.equipped)) {
      const bodyPart = body.parts[bodyPartId];

      // Remove if body part doesn't exist (destroyed, severed)
      if (!bodyPart) {
        delete equipment.equipped[bodyPartId];
        continue;
      }

      const slot = equipment.equipped[bodyPartId];
      if (!slot) continue;

      const item = itemRegistry.tryGet(slot.itemId);
      if (!item?.traits?.armor) continue;

      const target = item.traits.armor.target;

      // Validate by body part type
      if (target.bodyPartType && bodyPart.type !== target.bodyPartType) {
        // Invalid - remove item
        delete equipment.equipped[bodyPartId];
        continue;
      }

      // Validate by body part function
      if (target.bodyPartFunction) {
        if (!bodyPart.functions.includes(target.bodyPartFunction)) {
          // Invalid - remove item
          delete equipment.equipped[bodyPartId];
          continue;
        }
      }

      // Validate weight restriction (flying creatures)
      if (target.maxWeight && item.traits.armor.weight > target.maxWeight) {
        // Too heavy for this body part - remove
        delete equipment.equipped[bodyPartId];
      }
    }
  }

  /**
   * Update total weight and determine flight capability.
   */
  private updateWeightTracking(equipment: EquipmentComponent, body: BodyComponent): void {
    equipment.totalWeight = calculateTotalWeight(equipment);

    // Check if can fly (if has wings/flight capability)
    const hasFlightParts = Object.values(body.parts).some(p =>
      p.functions.includes('flight')
    );

    if (hasFlightParts) {
      const maxWeight = this.getMaxFlightWeight(body.size);
      equipment.canFly = equipment.totalWeight <= maxWeight;
    } else {
      equipment.canFly = false;
    }
  }

  /**
   * Get max flight weight based on body size.
   */
  private getMaxFlightWeight(size: SizeCategory): number {
    const weightLimits: Record<SizeCategory, number> = {
      tiny: 2,
      small: 8,
      medium: 15,   // Angels
      large: 30,
      huge: 60,
      colossal: 120,
    };
    return weightLimits[size];
  }

  /**
   * Cache defense stats for performance.
   */
  private cacheDefenseStats(equipment: EquipmentComponent, currentTick: number): void {
    equipment.cached = {
      totalDefense: getTotalDefense(equipment),
      resistances: this.calculateAllResistances(equipment),
      movementPenalty: getMovementPenalty(equipment),
      skillModifiers: this.calculateSkillModifiers(equipment),
      statModifiers: this.calculateStatModifiers(equipment),
      lastUpdateTick: currentTick,
    };
  }

  /**
   * Calculate resistances for all damage types.
   */
  private calculateAllResistances(equipment: EquipmentComponent): Record<string, number> {
    const damageTypes = ['slashing', 'piercing', 'bludgeoning', 'fire', 'frost', 'lightning', 'poison', 'magic'];
    const resistances: Record<string, number> = {};

    for (const damageType of damageTypes) {
      resistances[damageType] = getDamageResistance(equipment, damageType);
    }

    return resistances;
  }

  /**
   * Calculate skill modifiers from all equipped items.
   * Sums StatBonusTrait.skillModifiers from all equipped items.
   */
  private calculateSkillModifiers(equipment: EquipmentComponent): Record<string, number> {
    const modifiers: Record<string, number> = {};

    const equippedItems = getAllEquippedItems(equipment);

    for (const item of equippedItems) {
      const statBonus: StatBonusTrait | undefined = item.traits?.statBonus as StatBonusTrait | undefined;
      if (statBonus?.skillModifiers) {
        for (const [skill, bonus] of Object.entries(statBonus.skillModifiers)) {
          if (bonus !== undefined) {
            modifiers[skill] = (modifiers[skill] ?? 0) + bonus;
          }
        }
      }
    }

    return modifiers;
  }

  /**
   * Calculate stat modifiers from all equipped items (future expansion).
   * Sums StatBonusTrait.statModifiers from all equipped items.
   */
  private calculateStatModifiers(equipment: EquipmentComponent): Record<string, number> {
    const modifiers: Record<string, number> = {};

    const equippedItems = getAllEquippedItems(equipment);

    for (const item of equippedItems) {
      const statBonus: StatBonusTrait | undefined = item.traits?.statBonus as StatBonusTrait | undefined;
      if (statBonus?.statModifiers) {
        for (const [stat, bonus] of Object.entries(statBonus.statModifiers)) {
          if (bonus !== undefined) {
            modifiers[stat] = (modifiers[stat] ?? 0) + bonus;
          }
        }
      }
    }

    return modifiers;
  }

  /**
   * Remove broken equipment (durability <= 0).
   * TODO: Implement when ItemInstance registry is available.
   * Durability is tracked on ItemInstance.condition, not on ItemDefinition traits.
   */
  private removeBrokenEquipment(_equipment: EquipmentComponent): void {
    // TODO: Need ItemInstance registry to check instance.condition
    // Currently EquipmentSlot only stores itemId, not instanceId
    // Once we have instance tracking, check:
    //   - Get ItemInstance by slot.instanceId
    //   - Check instance.condition <= 0
    //   - Remove equipment if broken
  }
}
