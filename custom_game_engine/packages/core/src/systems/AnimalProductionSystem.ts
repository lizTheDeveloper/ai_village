import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { AnimalComponent } from '../components/AnimalComponent.js';
import { getProductsForSpecies, canProduceProduct, calculateProductQuality, type AnimalProduct } from '../data/animalProducts.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

/**
 * Tracks production state for each animal
 */
interface ProductionState {
  productId: string;
  daysSinceLastProduction: number;
  lastCollectionTick: number; // Track cooldown
}

/**
 * AnimalProductionSystem handles periodic and continuous product generation
 * Priority: 60 (after most other systems)
 *
 * @dependencies AnimalSystem - Reads animal health, life stage, and bond level for production
 */
export class AnimalProductionSystem extends BaseSystem {
  public readonly id: SystemId = 'animal_production';
  public readonly priority: number = 60;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Animal, CT.Position];
  // Only run when animal components exist (O(1) activation check)
  public readonly activationComponents = ['animal'] as const;
  protected readonly throttleInterval = 20; // NORMAL - 1 second
  public readonly dependsOn = ['animal'] as const;

  // Track production state for each animal
  private productionState: Map<string, ProductionState[]> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    // Convert deltaTime to game days (deltaTime is in seconds)
    const daysPassed = ctx.deltaTime / 86400;

    for (const entity of ctx.activeEntities) {
      const animal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
      if (!animal) {
        continue;
      }

      // Validate required fields per CLAUDE.md - NO SILENT FALLBACKS
      if (animal.health === undefined || animal.health === null) {
        throw new Error(`Animal ${animal.id} missing required CT.Health field`);
      }

      // Get products for this species
      const products = getProductsForSpecies(animal.speciesId);
      if (products.length === 0) {
        continue;
      }

      // Get or initialize production state for this animal
      let animalProduction = this.productionState.get(animal.id);
      if (!animalProduction) {
        // Initialize with negative tick to allow immediate collection for continuous products
        const cooldownTicks = 3600;
        animalProduction = products.map(p => ({
          productId: p.id,
          daysSinceLastProduction: 0,
          lastCollectionTick: -cooldownTicks, // Allow immediate first collection
        }));
        this.productionState.set(animal.id, animalProduction);
      }

      // Update production for each product
      for (const product of products) {
        // Only handle periodic products in this system
        // Continuous products (like milking) should be handled by player actions
        if (product.productionType !== 'periodic') {
          continue;
        }

        // Find production state for this product
        let productState = animalProduction.find(ps => ps.productId === product.id);
        if (!productState) {
          const cooldownTicks = 3600;
          productState = {
            productId: product.id,
            daysSinceLastProduction: 0,
            lastCollectionTick: -cooldownTicks, // Allow immediate first collection
          };
          animalProduction.push(productState);
        }

        // Update days since last production
        productState.daysSinceLastProduction += daysPassed;

        // Check if product is ready
        const intervalDays = product.productionInterval || 1;
        if (productState.daysSinceLastProduction >= intervalDays) {
          // Check if animal can produce
          const canProduce = canProduceProduct(product, {
            lifeStage: animal.lifeStage,
            health: animal.health,
            bondLevel: animal.bondLevel,
          });
          if (canProduce) {
            this.produceProduct(world, entity, animal, product, ctx);

            // Reset production timer
            productState.daysSinceLastProduction = 0;
          }
        }
      }
    }
  }

  /**
   * Produce a product and emit event
   */
  private produceProduct(world: World, entity: Entity, animal: AnimalComponent, product: AnimalProduct, ctx: SystemContext): void {
    // Quality calculation omitted for automatic production (not returned)

    // Calculate quantity (random between min and max)
    const quantity = Math.floor(
      product.minQuantity + Math.random() * (product.maxQuantity - product.minQuantity + 1)
    );

    // Only produce if quantity > 0
    if (quantity > 0) {
      // Emit product ready event
      ctx.emit('product_ready', {
        animalId: animal.id,
        productType: product.id,
        productId: product.id,
        itemId: product.itemId,
        amount: quantity,
      }, entity.id);
    }
  }

  /**
   * Manually trigger product collection (for continuous products like milking)
   * Accepts either full parameters or just entityId, productId, and optional agentId
   */
  public collectProduct(
    entityIdOrWorld: string | World,
    productIdOrEntity?: string | Entity,
    animalOrProductIdOrAgentId?: AnimalComponent | string,
    productIdOrAgentId?: string,
    agentId?: string
  ): { success: boolean; quantity?: number; quality?: number; reason?: string } {
    let world: World;
    let entity: Entity;
    let animal: AnimalComponent;
    let actualProductId: string;
    let actualAgentId: string | undefined;

    // Handle both signatures: (entityId, productId, agentId?) or (world, entity, animal, productId)
    if (typeof entityIdOrWorld === 'string') {
      // Signature: (entityId, productId, agentId?)
      world = this.world;
      const entityId = entityIdOrWorld;
      actualProductId = productIdOrEntity as string;
      actualAgentId = animalOrProductIdOrAgentId as string | undefined;

      const foundEntity = world.getEntity(entityId);
      if (!foundEntity) {
        return { success: false, reason: 'Entity not found' };
      }
      entity = foundEntity;

      const foundAnimal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
      if (!foundAnimal) {
        return { success: false, reason: 'Entity does not have animal component' };
      }
      animal = foundAnimal;
    } else {
      // Signature: (world, entity, animal, productId)
      world = entityIdOrWorld;
      entity = productIdOrEntity as Entity;
      animal = animalOrProductIdOrAgentId as AnimalComponent;
      actualProductId = productIdOrAgentId!;
      actualAgentId = agentId;
    }

    const products = getProductsForSpecies(animal.speciesId);
    const product = products.find(p => p.id === actualProductId);

    if (!product) {
      return { success: false, reason: 'Product not found for this species' };
    }

    if (product.productionType !== 'continuous') {
      return { success: false, reason: 'Product is not a continuous product' };
    }

    // Check ownership if agentId is provided
    if (actualAgentId !== undefined && !animal.wild && animal.ownerId !== actualAgentId) {
      return { success: false, reason: 'You are not the owner of this animal' };
    }

    // Check cooldown (1 hour = 3600 ticks at 20 TPS)
    const cooldownTicks = 3600; // 1 hour cooldown
    let productState = this.productionState.get(animal.id)?.find(ps => ps.productId === product.id);

    if (!productState) {
      // Initialize production state
      // Set lastCollectionTick to a value that allows immediate collection
      const animalProduction = this.productionState.get(animal.id) || [];
      productState = {
        productId: product.id,
        daysSinceLastProduction: 0,
        lastCollectionTick: -cooldownTicks, // Allow immediate first collection
      };
      animalProduction.push(productState);
      this.productionState.set(animal.id, animalProduction);
    }

    const currentTick = world.tick;
    if (currentTick - productState.lastCollectionTick < cooldownTicks) {
      return { success: false, reason: 'Product on cooldown - try again later' };
    }

    // Check if animal can produce
    if (!canProduceProduct(product, {
      lifeStage: animal.lifeStage,
      health: animal.health,
      bondLevel: animal.bondLevel,
    })) {
      return { success: false, reason: 'Animal cannot produce this product (check life stage, health, bond level)' };
    }

    // Calculate quality
    const quality = calculateProductQuality(
      product,
      {
        health: animal.health,
        bondLevel: animal.bondLevel,
      },
      50, // Default diet quality
      50  // Default genetics
    );

    // Calculate quantity
    const quantity = Math.floor(
      product.minQuantity + Math.random() * (product.maxQuantity - product.minQuantity + 1)
    );

    // Update cooldown
    productState.lastCollectionTick = currentTick;

    // Emit product collected event
    // Note: Using world.eventBus directly here since this method can be called outside of onUpdate
    world.eventBus.emit({
      type: 'product_ready',
      source: entity.id,
      data: {
        animalId: animal.id,
        productType: product.id,
        productId: product.id,
        itemId: product.itemId,
        amount: quantity,
      },
    });

    return { success: true, quantity: quantity, quality };
  }
}
