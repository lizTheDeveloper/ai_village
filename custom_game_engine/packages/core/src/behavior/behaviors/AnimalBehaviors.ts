/**
 * Animal Husbandry Behaviors - Taming and Housing
 *
 * TameAnimalBehavior: Agent approaches a wild animal and attempts to tame it
 * HouseAnimalBehavior: Agent leads a tamed animal to appropriate housing
 *
 * Part of the animal husbandry system integration
 */
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { AnimalComponent } from '../../components/AnimalComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { TamingSystem, type TamingMethod } from '../../systems/TamingSystem.js';
import { assignAnimalToHousing } from '../../actions/AnimalHousingActions.js';
import { getAnimalSpecies } from '../../data/animalSpecies.js';
import { isAnimalHousing, canHouseSpecies } from '../../data/animalHousingDefinitions.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
/** Distance at which taming can be attempted */
const TAMING_DISTANCE = 2.0;
/** Distance at which housing assignment happens */
const HOUSING_DISTANCE = 2.0;
/** Maximum search range for animals */
const MAX_ANIMAL_RANGE = 40;
/** Maximum search range for housing */
const MAX_HOUSING_RANGE = 50;
/**
 * TameAnimalBehavior - Approach and tame a wild animal
 *
 * BehaviorState:
 * - targetAnimalId?: string - Specific animal to tame (optional)
 * - targetSpecies?: string - Preferred species to find (optional)
 * - itemToOffer?: string - Food item to offer for bonus (optional)
 * - method?: TamingMethod - Taming method (default: 'feeding')
 * - attemptsMade?: number - Number of taming attempts made
 * - maxAttempts?: number - Max attempts before giving up (default: 3)
 */
export class TameAnimalBehavior extends BaseBehavior {
  readonly name = 'tame_animal' as const;
  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent(ComponentType.Position)!;
    const agent = entity.getComponent(ComponentType.Agent)!;
    const inventory = entity.getComponent(ComponentType.Inventory);
    this.disableSteering(entity);
    const state = agent.behaviorState || {};
    const targetAnimalId = state.targetAnimalId as string | undefined;
    const targetSpecies = state.targetSpecies as string | undefined;
    const itemToOffer = state.itemToOffer as string | undefined;
    const method = (state.method as TamingMethod) || 'feeding';
    const attemptsMade = (state.attemptsMade as number) || 0;
    const maxAttempts = (state.maxAttempts as number) || 3;
    // Find target animal
    let targetAnimal: { entity: EntityImpl; animal: AnimalComponent; position: PositionComponent } | null = null;
    if (targetAnimalId) {
      // Specific target
      const animalEntity = world.getEntity(targetAnimalId) as EntityImpl | undefined;
      if (animalEntity) {
        const animal = animalEntity.getComponent<AnimalComponent>(ComponentType.Animal);
        const animalPos = animalEntity.getComponent(ComponentType.Position);
        if (animal && animalPos && animal.wild) {
          targetAnimal = { entity: animalEntity, animal, position: animalPos };
        }
      }
    }
    if (!targetAnimal) {
      // Search for wild animal
      targetAnimal = this.findWildAnimal(world, position, targetSpecies);
    }
    if (!targetAnimal) {
      // No wild animals found
      this.complete(entity);
      return { complete: true, reason: 'No wild animals found nearby' };
    }
    // Move toward animal
    const distanceToAnimal = this.moveToward(entity, targetAnimal.position, { arrivalDistance: TAMING_DISTANCE });
    if (distanceToAnimal <= TAMING_DISTANCE) {
      this.stopAllMovement(entity);
      // Check if we've exceeded max attempts
      if (attemptsMade >= maxAttempts) {
        this.complete(entity);
        return { complete: true, reason: `Failed to tame after ${maxAttempts} attempts` };
      }
      // Determine what food to offer
      let foodToOffer = itemToOffer;
      if (!foodToOffer && inventory) {
        // Check for preferred food in inventory
        const species = getAnimalSpecies(targetAnimal.animal.speciesId);
        for (const preferredFood of species.preferredFood) {
          const hasFood = inventory.slots.some(s => s.itemId === preferredFood && s.quantity > 0);
          if (hasFood) {
            foodToOffer = preferredFood;
            break;
          }
        }
        // Fallback to any food
        if (!foodToOffer) {
          const foodSlot = inventory.slots.find(s =>
            s.itemId && s.quantity > 0 && (
              s.itemId === 'berry' ||
              s.itemId === 'food' ||
              s.itemId.includes('seed') ||
              s.itemId === 'wheat' ||
              s.itemId === 'carrot'
            )
          );
          if (foodSlot && foodSlot.itemId) {
            foodToOffer = foodSlot.itemId;
          }
        }
      }
      // Create taming system instance for this attempt
      const tamingSystem = new TamingSystem();
      tamingSystem.setWorld(world);
      // Attempt taming
      const result = tamingSystem.attemptTaming(
        world,
        targetAnimal.animal,
        entity.id,
        method,
        foodToOffer
      );
      // Consume offered food on attempt (regardless of success)
      if (foodToOffer && inventory) {
        const slot = inventory.slots.find(s => s.itemId === foodToOffer && s.quantity > 0);
        if (slot) {
          slot.quantity -= 1;
          entity.updateComponent<InventoryComponent>(ComponentType.Inventory, () => inventory);
        }
      }
      if (result.success) {
        // Emit success event (custom event not in GameEventMap)
        interface EventBusLike {
          emit(event: { type: string; source: string; data: unknown }): void;
        }
        (world.eventBus as EventBusLike).emit({
          type: 'agent:tamed_animal',
          source: entity.id,
          data: {
            agentId: entity.id,
            animalId: targetAnimal.entity.id,
            speciesId: targetAnimal.animal.speciesId,
            method,
          },
        });
        this.complete(entity);
        return { complete: true, reason: `Successfully tamed ${targetAnimal.animal.speciesId}` };
      } else {
        // Increment attempts
        this.updateState(entity, {
          ...state,
          targetAnimalId: targetAnimal.entity.id, // Lock onto this animal
          attemptsMade: attemptsMade + 1,
        });
        // Continue trying
        return { complete: false, reason: `Taming attempt ${attemptsMade + 1} failed, will retry` };
      }
    }
  }
  private findWildAnimal(
    world: World,
    position: PositionComponent,
    preferredSpecies?: string
  ): { entity: EntityImpl; animal: AnimalComponent; position: PositionComponent } | null {
    const animals = world.query().with(ComponentType.Animal).with(ComponentType.Position).executeEntities();
    let bestAnimal: { entity: EntityImpl; animal: AnimalComponent; position: PositionComponent } | null = null;
    let bestScore = Infinity;
    for (const animalEntity of animals) {
      const impl = animalEntity as EntityImpl;
      const animal = impl.getComponent<AnimalComponent>(ComponentType.Animal)!;
      const animalPos = impl.getComponent(ComponentType.Position)!;
      // Must be wild
      if (!animal.wild) continue;
      // Check if species can be tamed
      const species = getAnimalSpecies(animal.speciesId);
      if (!species.canBeTamed) continue;
      const distance = this.distance(position, animalPos);
      // Must be within range
      if (distance > MAX_ANIMAL_RANGE) continue;
      // Score: prefer closer animals, preferred species get bonus
      let score = distance;
      if (preferredSpecies && animal.speciesId === preferredSpecies) {
        score -= 20; // Bonus for preferred species
      }
      // Prefer animals with higher trust (easier to tame)
      score -= animal.trustLevel * 0.1;
      if (score < bestScore) {
        bestScore = score;
        bestAnimal = { entity: impl, animal, position: animalPos };
      }
    }
    return bestAnimal;
  }
}
/**
 * HouseAnimalBehavior - Lead a tamed animal to housing
 *
 * BehaviorState:
 * - targetAnimalId: string - The tamed animal to house (required)
 * - targetHousingId?: string - Specific housing to use (optional, will find suitable one)
 */
export class HouseAnimalBehavior extends BaseBehavior {
  readonly name = 'house_animal' as const;
  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent(ComponentType.Position)!;
    const agent = entity.getComponent(ComponentType.Agent)!;
    this.disableSteering(entity);
    const state = agent.behaviorState || {};
    const targetAnimalId = state.targetAnimalId as string | undefined;
    const targetHousingId = state.targetHousingId as string | undefined;
    if (!targetAnimalId) {
      // Find an unhoused tamed animal we own
      const ownedAnimal = this.findOwnedUnhousedAnimal(world, entity.id);
      if (!ownedAnimal) {
        this.complete(entity);
        return { complete: true, reason: 'No unhoused tamed animals found' };
      }
      this.updateState(entity, { ...state, targetAnimalId: ownedAnimal.entity.id });
      return;
    }
    // Get the animal
    const animalEntity = world.getEntity(targetAnimalId) as EntityImpl | undefined;
    if (!animalEntity) {
      this.complete(entity);
      return { complete: true, reason: 'Animal no longer exists' };
    }
    const animal = animalEntity.getComponent<AnimalComponent>(ComponentType.Animal);
    const animalPos = animalEntity.getComponent(ComponentType.Position);
    if (!animal || !animalPos) {
      this.complete(entity);
      return { complete: true, reason: 'Invalid animal entity' };
    }
    // Check animal is tamed and we own it
    if (animal.wild) {
      this.complete(entity);
      return { complete: true, reason: 'Animal is still wild' };
    }
    if (animal.ownerId !== entity.id) {
      this.complete(entity);
      return { complete: true, reason: 'You do not own this animal' };
    }
    // Already housed?
    if (animal.housingBuildingId) {
      this.complete(entity);
      return { complete: true, reason: 'Animal is already housed' };
    }
    // Find suitable housing
    let housing: { entity: EntityImpl; building: BuildingComponent; position: PositionComponent } | null = null;
    if (targetHousingId) {
      const housingEntity = world.getEntity(targetHousingId) as EntityImpl | undefined;
      if (housingEntity) {
        const building = housingEntity.getComponent(ComponentType.Building);
        const housingPos = housingEntity.getComponent(ComponentType.Position);
        if (building && housingPos) {
          housing = { entity: housingEntity, building, position: housingPos };
        }
      }
    }
    if (!housing) {
      housing = this.findSuitableHousing(world, position, animal.speciesId);
    }
    if (!housing) {
      this.complete(entity);
      return { complete: true, reason: `No suitable housing found for ${animal.speciesId}` };
    }
    // Move toward housing
    const distanceToHousing = this.moveToward(entity, housing.position, { arrivalDistance: HOUSING_DISTANCE });
    if (distanceToHousing <= HOUSING_DISTANCE) {
      this.stopAllMovement(entity);
      // Assign animal to housing
      const result = assignAnimalToHousing(world, targetAnimalId, housing.entity.id);
      if (result.success) {
        // Emit success event (custom event not in GameEventMap)
        interface EventBusLike {
          emit(event: { type: string; source: string; data: unknown }): void;
        }
        (world.eventBus as EventBusLike).emit({
          type: 'agent:housed_animal',
          source: entity.id,
          data: {
            agentId: entity.id,
            animalId: targetAnimalId,
            speciesId: animal.speciesId,
            housingId: housing.entity.id,
            housingType: housing.building.buildingType,
          },
        });
        this.complete(entity);
        return { complete: true, reason: `Housed ${animal.speciesId} in ${housing.building.buildingType}` };
      } else {
        this.complete(entity);
        return { complete: true, reason: `Failed to house: ${result.reason}` };
      }
    }
  }
  private findOwnedUnhousedAnimal(
    world: World,
    ownerId: string
  ): { entity: EntityImpl; animal: AnimalComponent } | null {
    const animals = world.query().with(ComponentType.Animal).executeEntities();
    for (const animalEntity of animals) {
      const impl = animalEntity as EntityImpl;
      const animal = impl.getComponent<AnimalComponent>(ComponentType.Animal)!;
      if (!animal.wild && animal.ownerId === ownerId && !animal.housingBuildingId) {
        return { entity: impl, animal };
      }
    }
    return null;
  }
  private findSuitableHousing(
    world: World,
    position: PositionComponent,
    speciesId: string
  ): { entity: EntityImpl; building: BuildingComponent; position: PositionComponent } | null {
    const buildings = world.query().with(ComponentType.Building).with(ComponentType.Position).executeEntities();
    let bestHousing: { entity: EntityImpl; building: BuildingComponent; position: PositionComponent } | null = null;
    let bestDistance = Infinity;
    for (const buildingEntity of buildings) {
      const impl = buildingEntity as EntityImpl;
      const building = impl.getComponent(ComponentType.Building)!;
      const buildingPos = impl.getComponent(ComponentType.Position)!;
      // Must be animal housing
      if (!isAnimalHousing(building.buildingType)) continue;
      // Must be complete
      if (!building.isComplete) continue;
      // Must be able to house this species
      if (!canHouseSpecies(building.buildingType, speciesId)) continue;
      // Must have capacity
      if (building.currentOccupants.length >= building.animalCapacity) continue;
      const distance = this.distance(position, buildingPos);
      // Must be within range
      if (distance > MAX_HOUSING_RANGE) continue;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestHousing = { entity: impl, building, position: buildingPos };
      }
    }
    return bestHousing;
  }
}
/**
 * Standalone functions for use with BehaviorRegistry.
 * @deprecated Use WithContext versions instead
 */
export function tameAnimalBehavior(entity: EntityImpl, world: World): void {
  const behavior = new TameAnimalBehavior();
  behavior.execute(entity, world);
}

/**
 * @deprecated Use WithContext versions instead
 */
export function houseAnimalBehavior(entity: EntityImpl, world: World): void {
  const behavior = new HouseAnimalBehavior();
  behavior.execute(entity, world);
}

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('tame_animal', tameAnimalBehaviorWithContext);
 */
export function tameAnimalBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  const state = ctx.getAllState();
  const targetAnimalId = state.targetAnimalId as string | undefined;
  const targetSpecies = state.targetSpecies as string | undefined;
  const itemToOffer = state.itemToOffer as string | undefined;
  const method = (state.method as TamingMethod) || 'feeding';
  const attemptsMade = (state.attemptsMade as number) || 0;
  const maxAttempts = (state.maxAttempts as number) || 3;

  // Find target animal
  let targetAnimal: { entity: EntityImpl; animal: AnimalComponent; position: PositionComponent } | null = null;
  if (targetAnimalId) {
    // Specific target
    const animalEntity = ctx.getEntity(targetAnimalId) as EntityImpl | undefined;
    if (animalEntity) {
      const animal = animalEntity.getComponent<AnimalComponent>(CT.Animal);
      const animalPos = animalEntity.getComponent<PositionComponent>(CT.Position);
      if (animal && animalPos && animal.wild) {
        targetAnimal = { entity: animalEntity, animal, position: animalPos };
      }
    }
  }

  if (!targetAnimal) {
    // Search for wild animals within range
    const nearbyAnimals = ctx.getEntitiesInRadius(MAX_ANIMAL_RANGE, [CT.Animal]);
    let bestAnimal: { entity: EntityImpl; animal: AnimalComponent; position: PositionComponent } | null = null;
    let bestScore = Infinity;

    for (const result of nearbyAnimals) {
      const impl = result.entity as EntityImpl;
      const animal = impl.getComponent<AnimalComponent>(CT.Animal)!;

      // Must be wild
      if (!animal.wild) continue;

      // Check if species can be tamed
      const species = getAnimalSpecies(animal.speciesId);
      if (!species.canBeTamed) continue;

      // Score: prefer closer animals, preferred species get bonus
      let score = result.distance;
      if (targetSpecies && animal.speciesId === targetSpecies) {
        score -= 20; // Bonus for preferred species
      }

      // Prefer animals with higher trust (easier to tame)
      score -= animal.trustLevel * 0.1;

      if (score < bestScore) {
        bestScore = score;
        const animalPos = impl.getComponent<PositionComponent>(CT.Position)!;
        bestAnimal = { entity: impl, animal, position: animalPos };
      }
    }

    targetAnimal = bestAnimal;
  }

  if (!targetAnimal) {
    // No wild animals found
    return ctx.complete('No wild animals found nearby');
  }

  // Move toward animal
  const distance = ctx.moveToward(targetAnimal.position, { arrivalDistance: TAMING_DISTANCE });

  if (distance <= TAMING_DISTANCE) {
    ctx.stopMovement();

    // Check if we've exceeded max attempts
    if (attemptsMade >= maxAttempts) {
      return ctx.complete(`Failed to tame after ${maxAttempts} attempts`);
    }

    // Determine what food to offer
    let foodToOffer = itemToOffer;
    if (!foodToOffer && ctx.inventory) {
      // Check for preferred food in inventory
      const species = getAnimalSpecies(targetAnimal.animal.speciesId);
      for (const preferredFood of species.preferredFood) {
        const hasFood = ctx.inventory.slots.some(s => s.itemId === preferredFood && s.quantity > 0);
        if (hasFood) {
          foodToOffer = preferredFood;
          break;
        }
      }

      // Fallback to any food
      if (!foodToOffer) {
        const foodSlot = ctx.inventory.slots.find(s =>
          s.itemId && s.quantity > 0 && (
            s.itemId === 'berry' ||
            s.itemId === 'food' ||
            s.itemId.includes('seed') ||
            s.itemId === 'wheat' ||
            s.itemId === 'carrot'
          )
        );
        if (foodSlot && foodSlot.itemId) {
          foodToOffer = foodSlot.itemId;
        }
      }
    }

    // Create taming system instance for this attempt
    const tamingSystem = new TamingSystem();
    // Access world from BehaviorContext
    interface ContextWithWorld {
      world: World;
    }
    const world = (ctx as unknown as ContextWithWorld).world;
    tamingSystem.setWorld(world);

    // Attempt taming
    const result = tamingSystem.attemptTaming(
      world,
      targetAnimal.animal,
      ctx.entity.id,
      method,
      foodToOffer
    );

    // Consume offered food on attempt (regardless of success)
    if (foodToOffer && ctx.inventory) {
      const slot = ctx.inventory.slots.find(s => s.itemId === foodToOffer && s.quantity > 0);
      if (slot) {
        slot.quantity -= 1;
        ctx.updateComponent<InventoryComponent>(CT.Inventory, () => ctx.inventory!);
      }
    }

    if (result.success) {
      // Emit success event
      ctx.emit({
        type: 'agent:tamed_animal',
        data: {
          agentId: ctx.entity.id,
          animalId: targetAnimal.entity.id,
          speciesId: targetAnimal.animal.speciesId,
          method,
        },
      });

      return ctx.complete(`Successfully tamed ${targetAnimal.animal.speciesId}`);
    } else {
      // Increment attempts
      ctx.updateState({
        targetAnimalId: targetAnimal.entity.id, // Lock onto this animal
        attemptsMade: attemptsMade + 1,
      });

      // Continue trying
      return { complete: false, reason: `Taming attempt ${attemptsMade + 1} failed, will retry` };
    }
  }
}

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('house_animal', houseAnimalBehaviorWithContext);
 */
export function houseAnimalBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  const state = ctx.getAllState();
  const targetAnimalId = state.targetAnimalId as string | undefined;
  const targetHousingId = state.targetHousingId as string | undefined;

  if (!targetAnimalId) {
    // Find an unhoused tamed animal we own
    const animals = ctx.getEntitiesInRadius(200, [CT.Animal]); // Large radius to find owned animals
    let ownedAnimal: { entity: EntityImpl; animal: AnimalComponent } | null = null;

    for (const result of animals) {
      const impl = result.entity as EntityImpl;
      const animal = impl.getComponent<AnimalComponent>(CT.Animal)!;
      if (!animal.wild && animal.ownerId === ctx.entity.id && !animal.housingBuildingId) {
        ownedAnimal = { entity: impl, animal };
        break;
      }
    }

    if (!ownedAnimal) {
      return ctx.complete('No unhoused tamed animals found');
    }

    ctx.updateState({ targetAnimalId: ownedAnimal.entity.id });
    return;
  }

  // Get the animal
  const animalEntity = ctx.getEntity(targetAnimalId) as EntityImpl | undefined;
  if (!animalEntity) {
    return ctx.complete('Animal no longer exists');
  }

  const animal = animalEntity.getComponent<AnimalComponent>(CT.Animal);
  const animalPos = animalEntity.getComponent<PositionComponent>(CT.Position);

  if (!animal || !animalPos) {
    return ctx.complete('Invalid animal entity');
  }

  // Check animal is tamed and we own it
  if (animal.wild) {
    return ctx.complete('Animal is still wild');
  }

  if (animal.ownerId !== ctx.entity.id) {
    return ctx.complete('You do not own this animal');
  }

  // Already housed?
  if (animal.housingBuildingId) {
    return ctx.complete('Animal is already housed');
  }

  // Find suitable housing
  let housing: { entity: EntityImpl; building: BuildingComponent; position: PositionComponent } | null = null;

  if (targetHousingId) {
    const housingEntity = ctx.getEntity(targetHousingId) as EntityImpl | undefined;
    if (housingEntity) {
      const building = housingEntity.getComponent<BuildingComponent>(CT.Building);
      const housingPos = housingEntity.getComponent<PositionComponent>(CT.Position);
      if (building && housingPos) {
        housing = { entity: housingEntity, building, position: housingPos };
      }
    }
  }

  if (!housing) {
    // Search for suitable housing
    const nearbyBuildings = ctx.getEntitiesInRadius(MAX_HOUSING_RANGE, [CT.Building]);
    let bestHousing: { entity: EntityImpl; building: BuildingComponent; position: PositionComponent } | null = null;
    let bestDistance = Infinity;

    for (const result of nearbyBuildings) {
      const impl = result.entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>(CT.Building)!;

      // Must be animal housing
      if (!isAnimalHousing(building.buildingType)) continue;

      // Must be complete
      if (!building.isComplete) continue;

      // Must be able to house this species
      if (!canHouseSpecies(building.buildingType, animal.speciesId)) continue;

      // Must have capacity
      if (building.currentOccupants.length >= building.animalCapacity) continue;

      if (result.distance < bestDistance) {
        bestDistance = result.distance;
        const buildingPos = impl.getComponent<PositionComponent>(CT.Position)!;
        bestHousing = { entity: impl, building, position: buildingPos };
      }
    }

    housing = bestHousing;
  }

  if (!housing) {
    return ctx.complete(`No suitable housing found for ${animal.speciesId}`);
  }

  // Move toward housing
  const distance = ctx.moveToward(housing.position, { arrivalDistance: HOUSING_DISTANCE });

  if (distance <= HOUSING_DISTANCE) {
    ctx.stopMovement();

    // Assign animal to housing
    interface ContextWithWorld {
      world: World;
    }
    const world = (ctx as unknown as ContextWithWorld).world;
    const result = assignAnimalToHousing(world, targetAnimalId, housing.entity.id);

    if (result.success) {
      // Emit success event
      ctx.emit({
        type: 'agent:housed_animal',
        data: {
          agentId: ctx.entity.id,
          animalId: targetAnimalId,
          speciesId: animal.speciesId,
          housingId: housing.entity.id,
          housingType: housing.building.buildingType,
        },
      });

      return ctx.complete(`Housed ${animal.speciesId} in ${housing.building.buildingType}`);
    } else {
      return ctx.complete(`Failed to house: ${result.reason}`);
    }
  }
}
