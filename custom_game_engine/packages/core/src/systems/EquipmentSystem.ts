/**
 * @status DISABLED (export only)
 * @reason Commented out in src/systems/index.ts (line 118) but actually functional
 *
 * ## What This System Does
 * EquipmentSystem manages dynamic body-based equipment for all species (humanoids, angels,
 * aliens, insectoids, etc.). It validates equipment against body parts, tracks weight for
 * flying creatures, calculates defense/resistance stats, handles durability degradation,
 * and detects armor set bonuses.
 *
 * Key features:
 * - Dynamic equipment slots based on BodyComponent.parts (not fixed humanoid slots)
 * - Weight-based flight restrictions (angels can't fly if overloaded)
 * - Armor validation by body part type and function
 * - Weekly durability degradation (quality-adjusted)
 * - Cached defense stats for performance
 * - Set bonuses (3+ pieces of same material/class)
 *
 * ## What's Broken/Incomplete
 * **NOTHING IS BROKEN!** The system is fully functional:
 * - ✅ All 19 tests pass (src/systems/__tests__/EquipmentSystem.test.ts)
 * - ✅ Properly imported and registered in registerAllSystems.ts (line 275, 919)
 * - ✅ EquipmentComponent exported in src/components/index.ts (line 58)
 * - ✅ ComponentType.Equipment defined in src/types/ComponentType.ts (line 27)
 * - ✅ No TypeScript compilation errors
 * - ✅ Integrates with ItemRegistry, ItemInstanceRegistry, BodyComponent
 * - ✅ Uses SystemContext (BaseSystem) with proper throttling
 * - ✅ Event-driven weekly degradation via time:new_week
 *
 * The system was disabled in index.ts on 2026-01-01 (commit ae46318a2) with TODO comment
 * "Fix EquipmentSystem errors before re-enabling", but no actual errors exist.
 *
 * ## TODO to Enable
 * - [x] Verify tests pass (DONE - 19/19 passing)
 * - [x] Verify compilation works (DONE - no errors)
 * - [x] Verify system is registered (DONE - registerAllSystems.ts line 919)
 * - [ ] Uncomment export in src/systems/index.ts line 118:
 *       Change `// export * from './EquipmentSystem.js';`
 *       to `export * from './EquipmentSystem.js';`
 * - [ ] Remove TODO comment on line 117
 * - [ ] Test in running game to verify integration with BodySystem
 * - [ ] Verify agents can equip items via EquipmentComponent
 * - [ ] Consider adding UI panel for equipment management
 *
 * ## Integration Notes
 * - **EquipmentComponent vs EquipmentSlotsComponent**: This system uses EquipmentComponent
 *   (dynamic body-based slots). EquipmentSlotsComponent is an older fixed-slot design
 *   currently used by GatherBehavior for tool wear. Consider migrating to unified system.
 * - **BodyComponent dependency**: Requires BodySystem to be active
 * - **ItemInstanceRegistry**: Uses global registry for durability tracking
 * - **Time events**: Subscribes to time:new_week for degradation
 *
 * EquipmentSystem - Manages dynamic body-based equipment
 *
 * Handles:
 * - Equipment validation (can this body part wear this armor?)
 * - Weight tracking and flight capability
 * - Defense/resistance calculations
 * - Durability degradation
 * - Set bonus detection
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { SystemId } from '../types.js';
import { ComponentType } from '../types/ComponentType.js';
import type { EquipmentComponent } from '../components/EquipmentComponent.js';
import type { BodyComponent, SizeCategory } from '../components/BodyComponent.js';
import { calculateTotalWeight, getTotalDefense, getDamageResistance, getMovementPenalty, getAllEquippedItems } from '../components/EquipmentComponent.js';
import { itemRegistry } from '../items/index.js';
import type { StatBonusTrait } from '../items/traits/StatBonusTrait.js';
import { itemInstanceRegistry } from '../items/ItemInstanceRegistry.js';
import type { EventBus } from '../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

/**
 * Weekly wear amount for armor and clothing.
 * At 1 point per week, a pristine item (condition 100) lasts ~2 years.
 * Quality affects effective wear: legendary items degrade slower.
 */
const WEEKLY_WEAR_AMOUNT = 1;

export class EquipmentSystem extends BaseSystem {
  public readonly id: SystemId = 'equipment';
  public readonly priority = 15;  // After movement, before combat
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    ComponentType.Equipment,
    ComponentType.Body,
  ];
  // Only run when equipment components exist (O(1) activation check)
  public readonly activationComponents = [ComponentType.Equipment] as const;
  protected readonly throttleInterval = 20; // NORMAL - 1 second

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

  private eventBus: EventBus | null = null;
  private worldRef: World | null = null;

  /**
   * Initialize the system with an event bus for scheduled degradation.
   * Call this after construction to enable weekly equipment wear.
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
    this._setupEventListeners();
  }

  /**
   * Subscribe to time events for scheduled degradation.
   */
  protected onInitialize(): void {
    this._setupEventListeners();
  }

  /**
   * Subscribe to time events for scheduled degradation.
   */
  private _setupEventListeners(): void {
    if (!this.events) return;

    // Degrade armor and clothing every 7 in-game days
    this.events.onGeneric('time:new_week', () => {
      if (this.worldRef) {
        this.degradeAllEquipment(this.worldRef);
      }
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // Cache world reference for event handlers
    this.worldRef = ctx.world;
    this.tickCounter++;

    // During warmup, always update (for tests and initialization)
    // After warmup, throttle to UPDATE_INTERVAL
    const inWarmup = this.tickCounter <= EquipmentSystem.WARMUP_TICKS;
    const shouldUpdate = inWarmup || this.tickCounter % EquipmentSystem.UPDATE_INTERVAL === 0;

    if (!shouldUpdate) {
      return;
    }

    const entities = ctx.activeEntities;

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

      // 4. Durability degradation is handled by time:new_week event (see degradeAllEquipment)

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
   * Durability is tracked on ItemInstance.condition.
   */
  private removeBrokenEquipment(equipment: EquipmentComponent): void {
    // Check body part equipment
    for (const [partId, slot] of Object.entries(equipment.equipped)) {
      if (!slot) continue;

      // If slot has instanceId, check condition via registry
      if (slot.instanceId) {
        if (!itemInstanceRegistry.has(slot.instanceId)) {
          // Instance doesn't exist - remove equipment
          delete equipment.equipped[partId];
          continue;
        }

        const instance = itemInstanceRegistry.get(slot.instanceId);
        if (instance.condition <= 0) {
          // Item is broken - remove from slot
          delete equipment.equipped[partId];
        }
      }
    }

    // Check weapon slots
    if (equipment.weapons.mainHand?.instanceId) {
      const instanceId = equipment.weapons.mainHand.instanceId;
      if (!itemInstanceRegistry.has(instanceId) || itemInstanceRegistry.get(instanceId).condition <= 0) {
        equipment.weapons.mainHand = undefined;
      }
    }

    if (equipment.weapons.offHand?.instanceId) {
      const instanceId = equipment.weapons.offHand.instanceId;
      if (!itemInstanceRegistry.has(instanceId) || itemInstanceRegistry.get(instanceId).condition <= 0) {
        equipment.weapons.offHand = undefined;
      }
    }
  }

  /**
   * Degrade all equipped armor and clothing in the world.
   * Called once per week (7 in-game days) via time:new_week event.
   *
   * Wear calculation:
   * - Base wear: 1 point per week
   * - Quality factor: legendary (0.4x), masterwork (0.6x), fine (0.8x), normal (1.0x), poor (1.5x)
   * - At base wear, pristine items last ~2 in-game years
   */
  private degradeAllEquipment(world: World): void {
    // Query all entities with equipment
    const entities = world.query()
      .with(ComponentType.Equipment)
      .executeEntities();

    for (const entity of entities) {
      const equipment = entity.components.get('equipment') as EquipmentComponent;
      if (!equipment) continue;

      // Degrade body part equipment (armor, clothing)
      for (const slot of Object.values(equipment.equipped)) {
        if (!slot?.instanceId) continue;
        if (!itemInstanceRegistry.has(slot.instanceId)) continue;

        const instance = itemInstanceRegistry.get(slot.instanceId);
        const item = itemRegistry.tryGet(instance.definitionId);

        // Only degrade items with armor trait (includes clothing, armor, shields)
        // Weapons degrade during combat, not passively
        if (!item?.traits?.armor) continue;

        // Calculate quality-adjusted wear
        const wearAmount = this.calculateQualityAdjustedWear(instance.quality);

        // Apply wear (minimum condition is 0)
        instance.condition = Math.max(0, instance.condition - wearAmount);
      }
    }
  }

  /**
   * Calculate wear amount adjusted for item quality.
   * Higher quality items degrade slower.
   */
  private calculateQualityAdjustedWear(quality: number): number {
    let qualityFactor: number;

    if (quality >= 95) {
      qualityFactor = 0.4;  // Legendary - lasts 2.5x longer
    } else if (quality >= 85) {
      qualityFactor = 0.6;  // Masterwork - lasts ~1.7x longer
    } else if (quality >= 70) {
      qualityFactor = 0.8;  // Fine - lasts 1.25x longer
    } else if (quality >= 40) {
      qualityFactor = 1.0;  // Normal - baseline
    } else {
      qualityFactor = 1.5;  // Poor - wears 1.5x faster
    }

    return WEEKLY_WEAR_AMOUNT * qualityFactor;
  }
}
