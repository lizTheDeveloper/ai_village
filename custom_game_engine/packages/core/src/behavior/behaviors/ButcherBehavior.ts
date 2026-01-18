/**
 * ButcherBehavior - Butcher a tame animal for meat and resources
 *
 * Requirements:
 * - Requires butchering_table building within range
 * - Requires cooking skill level 1+
 * - Quality scales with cooking skill and butchering specialization
 *
 * Used when:
 * - Agent needs food and has tame animals
 * - Culling excess animals
 * - Processing old/sick animals
 *
 * Integrates with CookingSystem for XP and quality bonuses.
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { World, WorldMutator } from '../../ecs/World.js';
import { EntityImpl } from '../../ecs/Entity.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { SkillsComponent, SkillLevel } from '../../components/SkillsComponent.js';
import { getQualityMultiplier, getSpecializationBonus } from '../../components/SkillsComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { BuildingTargeting } from '../../targeting/BuildingTargeting.js';
import { BuildingType } from '../../types/BuildingType.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';

export interface ButcherState {
  /** Target animal entity to butcher */
  targetId: string;

  /** Reason for butchering */
  reason?: 'food' | 'culling' | 'mercy';
}

export class ButcherBehavior extends BaseBehavior {
  public readonly name = 'butcher' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult {
    const agent = entity.getComponent<AgentComponent>(CT.Agent);

    if (!agent) {
      return {
        complete: true,
        reason: 'No agent component',
      };
    }

    // Read behavior state from agent component
    const state = agent.behaviorState as unknown as ButcherState | undefined;
    if (!state || !state.targetId) {
      return {
        complete: true,
        reason: 'Missing butcher target in behaviorState',
      };
    }

    const { targetId, reason = 'food' } = state;

    // Check for nearby butchering table
    const buildingTargeting = new BuildingTargeting();
    const butcheringTable = buildingTargeting.findNearest(entity, world, {
      buildingType: BuildingType.ButcheringTable,
      completed: true,
      maxDistance: 5, // Within 5 tiles
    });

    if (!butcheringTable) {
      return {
        complete: true,
        reason: 'No butchering table nearby - need butchering_table within 5 tiles',
      };
    }

    // Check cooking skill requirement
    const skills = entity.getComponent<SkillsComponent>(CT.Skills);
    const cookingLevel = skills?.levels?.cooking ?? 0;

    if (cookingLevel < 1) {
      return {
        complete: true,
        reason: 'Insufficient cooking skill - need level 1+ to butcher animals',
      };
    }

    // Validate target exists
    const target = world.getEntity(targetId);
    if (!target) {
      return {
        complete: true,
        reason: `Butcher target ${targetId} not found`,
      };
    }

    // Check if target is an animal
    if (!world.hasComponent(targetId, CT.Animal)) {
      return {
        complete: true,
        reason: `Cannot butcher ${targetId} - not an animal`,
      };
    }

    // Get animal component for species/size info
    interface AnimalComponentWithDanger {
      danger?: number;
      species?: string;
    }
    const animal = world.getComponent(targetId, CT.Animal) as AnimalComponentWithDanger | undefined;
    if (!animal) {
      return {
        complete: true,
        reason: 'Animal component missing',
      };
    }

    // Calculate quality based on cooking skill + butchering specialization
    const quality = this.calculateButcheringQuality(skills, cookingLevel);

    // Calculate product quantities based on animal size/danger
    const animalSize = animal.danger || 1;
    const baseMeatQuantity = Math.max(2, Math.floor(animalSize));
    const baseHideQuantity = 1;
    const baseBonesQuantity = 1;

    // Quality bonus: high quality (>75) gives +1 meat
    const qualityBonus = quality > 75 ? 1 : 0;
    const meatQuantity = baseMeatQuantity + qualityBonus;

    // Add products to inventory
    interface InventorySlot {
      itemId: string;
      quantity: number;
    }
    interface SimpleInventory {
      slots: InventorySlot[];
    }
    const inventory = entity.getComponent(CT.Inventory) as SimpleInventory | undefined;
    if (inventory) {
      entity.updateComponent(CT.Inventory, (inv: SimpleInventory) => ({
        ...inv,
        slots: [
          ...inv.slots,
          { itemId: 'meat', quantity: meatQuantity },
          { itemId: 'hide', quantity: baseHideQuantity },
          { itemId: 'bones', quantity: baseBonesQuantity },
        ],
      }));
    }

    // Remove the animal entity from the world
    (world as WorldMutator).destroyEntity(targetId, 'butchered');

    // Emit crafting:completed event for CookingSystem integration
    // This allows CookingSystem to track butchering XP and specialization
    world.eventBus.emit({
      type: 'crafting:completed',
      source: 'butcher-behavior',
      data: {
        jobId: `butcher_${entity.id}_${Date.now()}`,
        agentId: entity.id,
        recipeId: `butcher_${animal.species || 'animal'}`, // Synthetic recipe ID
        produced: [
          { itemId: 'meat', amount: meatQuantity, quality },
          { itemId: 'hide', amount: baseHideQuantity, quality },
          { itemId: 'bones', amount: baseBonesQuantity, quality },
        ],
      },
    });

    return {
      complete: true,
      reason: `Butchered ${animal.species || 'animal'} for ${reason} (quality: ${quality})`,
    };
  }

  /**
   * Calculate butchering quality based on cooking, combat, and hunting skills.
   * Butchering benefits from:
   * - Cooking skill (primary): Food preparation knowledge
   * - Combat skill: Understanding of anatomy and weak points
   * - Hunting skill: Field dressing experience
   * - Butchering specialization: Dedicated practice
   */
  private calculateButcheringQuality(
    skills: SkillsComponent | undefined,
    cookingLevel: number
  ): number {
    if (!skills) return 50; // Base quality if no skills

    // Base quality: 50 points
    let quality = 50;

    // Primary: Cooking skill quality multiplier (0.7 to 1.2) - 60% weight
    const qualityMultiplier = getQualityMultiplier(cookingLevel as SkillLevel);
    quality *= qualityMultiplier;

    // Secondary: Combat skill bonus (anatomy knowledge) - 20% weight
    const combatLevel = skills.levels.combat ?? 0;
    const combatBonus = combatLevel * 2; // Up to +10 at level 5
    quality += combatBonus * 0.2;

    // Secondary: Hunting skill bonus (field dressing) - 20% weight
    const huntingLevel = skills.levels.hunting ?? 0;
    const huntingBonus = huntingLevel * 2; // Up to +10 at level 5
    quality += huntingBonus * 0.2;

    // Butchering specialization bonus (0-10)
    const butcheringBonus = getSpecializationBonus(skills, 'cooking', 'butchering');
    quality += butcheringBonus;

    // Random variance (-5 to +5)
    const variance = (Math.random() - 0.5) * 10;
    quality += variance;

    return Math.max(0, Math.min(100, Math.round(quality)));
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 * @deprecated Use butcherBehaviorWithContext with BehaviorContext instead
 */
export function butcherBehavior(entity: EntityImpl, world: World): void {
  const behavior = new ButcherBehavior();
  behavior.execute(entity, world);
}

/**
 * Calculate butchering quality based on cooking, combat, and hunting skills.
 * Butchering benefits from:
 * - Cooking skill (primary): Food preparation knowledge
 * - Combat skill: Understanding of anatomy and weak points
 * - Hunting skill: Field dressing experience
 * - Butchering specialization: Dedicated practice
 */
function calculateButcheringQuality(
  skills: SkillsComponent | undefined,
  cookingLevel: number
): number {
  if (!skills) return 50; // Base quality if no skills

  // Base quality: 50 points
  let quality = 50;

  // Primary: Cooking skill quality multiplier (0.7 to 1.2) - 60% weight
  const qualityMultiplier = getQualityMultiplier(cookingLevel as SkillLevel);
  quality *= qualityMultiplier;

  // Secondary: Combat skill bonus (anatomy knowledge) - 20% weight
  const combatLevel = skills.levels.combat ?? 0;
  const combatBonus = combatLevel * 2; // Up to +10 at level 5
  quality += combatBonus * 0.2;

  // Secondary: Hunting skill bonus (field dressing) - 20% weight
  const huntingLevel = skills.levels.hunting ?? 0;
  const huntingBonus = huntingLevel * 2; // Up to +10 at level 5
  quality += huntingBonus * 0.2;

  // Butchering specialization bonus (0-10)
  const butcheringBonus = getSpecializationBonus(skills, 'cooking', 'butchering');
  quality += butcheringBonus;

  // Random variance (-5 to +5)
  const variance = (Math.random() - 0.5) * 10;
  quality += variance;

  return Math.max(0, Math.min(100, Math.round(quality)));
}

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('butcher', butcherBehaviorWithContext);
 *
 * Note: This behavior requires World access for BuildingTargeting and entity destruction.
 * BehaviorContext doesn't expose these APIs yet, so we use internal access as a temporary measure.
 */
export function butcherBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  // Read behavior state
  const state = ctx.getAllState() as unknown as ButcherState | undefined;
  if (!state || !state.targetId) {
    return ctx.complete('Missing butcher target in behaviorState');
  }

  const { targetId, reason = 'food' } = state;

  // Access world through internal property (temporary until BehaviorContext exposes needed APIs)
  const world = (ctx as unknown as { world: World }).world;

  // Check for nearby butchering table
  const buildingTargeting = new BuildingTargeting();
  const butcheringTable = buildingTargeting.findNearest(ctx.entity, world, {
    buildingType: BuildingType.ButcheringTable,
    completed: true,
    maxDistance: 5, // Within 5 tiles
  });

  if (!butcheringTable) {
    return ctx.complete('No butchering table nearby - need butchering_table within 5 tiles');
  }

  // Check cooking skill requirement
  const skills = ctx.getComponent<SkillsComponent>(CT.Skills);
  const cookingLevel = skills?.levels?.cooking ?? 0;

  if (cookingLevel < 1) {
    return ctx.complete('Insufficient cooking skill - need level 1+ to butcher animals');
  }

  // Validate target exists
  const target = ctx.getEntity(targetId);
  if (!target) {
    return ctx.complete(`Butcher target ${targetId} not found`);
  }

  const targetEntity = target as EntityImpl;

  // Check if target is an animal
  if (!targetEntity.hasComponent(CT.Animal)) {
    return ctx.complete(`Cannot butcher ${targetId} - not an animal`);
  }

  // Get animal component for species/size info
  interface AnimalComponentWithDanger {
    danger?: number;
    species?: string;
  }
  const animal = targetEntity.getComponent(CT.Animal) as AnimalComponentWithDanger | undefined;
  if (!animal) {
    return ctx.complete('Animal component missing');
  }

  // Calculate quality based on cooking skill + butchering specialization
  const quality = calculateButcheringQuality(skills, cookingLevel);

  // Calculate product quantities based on animal size/danger
  const animalSize = animal.danger || 1;
  const baseMeatQuantity = Math.max(2, Math.floor(animalSize));
  const baseHideQuantity = 1;
  const baseBonesQuantity = 1;

  // Quality bonus: high quality (>75) gives +1 meat
  const qualityBonus = quality > 75 ? 1 : 0;
  const meatQuantity = baseMeatQuantity + qualityBonus;

  // Add products to inventory
  if (ctx.inventory) {
    interface InventorySlot {
      itemId: string;
      quantity: number;
    }
    interface SimpleInventory {
      slots: InventorySlot[];
    }
    ctx.updateComponent(CT.Inventory, (inv: SimpleInventory) => ({
      ...inv,
      slots: [
        ...inv.slots,
        { itemId: 'meat', quantity: meatQuantity },
        { itemId: 'hide', quantity: baseHideQuantity },
        { itemId: 'bones', quantity: baseBonesQuantity },
      ],
    }));
  }

  // Remove the animal entity from the world
  (world as unknown as WorldMutator).destroyEntity(targetId, 'butchered');

  // Emit crafting:completed event for CookingSystem integration
  // This allows CookingSystem to track butchering XP and specialization
  ctx.emit({
    type: 'crafting:completed',
    data: {
      jobId: `butcher_${ctx.entity.id}_${Date.now()}`,
      agentId: ctx.entity.id,
      recipeId: `butcher_${animal.species || 'animal'}`, // Synthetic recipe ID
      produced: [
        { itemId: 'meat', amount: meatQuantity, quality },
        { itemId: 'hide', amount: baseHideQuantity, quality },
        { itemId: 'bones', amount: baseBonesQuantity, quality },
      ],
    },
  });

  return ctx.complete(`Butchered ${animal.species || 'animal'} for ${reason} (quality: ${quality})`);
}
