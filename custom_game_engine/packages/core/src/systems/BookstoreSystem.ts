import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus as CoreEventBus } from '../events/EventBus.js';
import type { EntityId } from '../types.js';

interface BookInventory {
  bookId: string;
  stock: number;
  price: number;
  sold: number;
  revenue: number;
}

interface BookstoreData {
  bookstoreId: EntityId;
  inventory: Map<string, BookInventory>;
  totalRevenue: number;
  lastRestockTick: number;
}

/**
 * BookstoreSystem manages commercial book sales
 *
 * Handles book purchases, inventory, restocking, and revenue tracking.
 *
 * Responsibilities:
 * - Process book purchases
 * - Track inventory levels
 * - Auto-restock low inventory
 * - Track revenue and sales
 * - Emit bookstore events
 */
export class BookstoreSystem extends BaseSystem {
  readonly id: SystemId = 'bookstore';
  readonly priority = 46;
  readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Bookstore];
  // Only run when bookstore components exist (O(1) activation check)
  readonly activationComponents = [CT.Bookstore] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  // Bookstore data (bookstoreId → BookstoreData)
  private bookstores: Map<EntityId, BookstoreData> = new Map();

  // Revenue milestones for tracking
  private revenueMilestones = [100, 500, 1000, 5000, 10000];

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = this.getCurrentTick(ctx.world);

    // Process each bookstore
    for (const entity of ctx.activeEntities) {
      const bookstoreId = entity.id;
      let bookstore = this.bookstores.get(bookstoreId);

      if (!bookstore) {
        // Initialize new bookstore
        bookstore = {
          bookstoreId,
          inventory: new Map(),
          totalRevenue: 0,
          lastRestockTick: currentTick,
        };
        this.bookstores.set(bookstoreId, bookstore);
      }

      // Check for low stock and restock
      this.checkAndRestock(bookstore, currentTick);
    }
  }

  /**
   * Purchase a book from the bookstore
   */
  public purchaseBook(
    bookstoreId: EntityId,
    buyerId: EntityId,
    bookId: string,
    quantity: number
  ): boolean {
    const bookstore = this.bookstores.get(bookstoreId);
    if (!bookstore) {
      return false;
    }

    const item = bookstore.inventory.get(bookId);
    if (!item || item.stock < quantity) {
      // Out of stock
      this.events.emit('bookstore:out_of_stock', {
        bookstoreId,
        bookId,
        customerId: buyerId,
      });
      return false;
    }

    // Process purchase
    item.stock -= quantity;
    item.sold += quantity;
    const totalPrice = item.price * quantity;
    item.revenue += totalPrice;
    bookstore.totalRevenue += totalPrice;

    this.events.emit('bookstore:purchase', {
      bookstoreId,
      buyerId,
      bookId,
      price: item.price,
      quantity,
    });

    // Check for revenue milestones
    this.checkRevenueMilestones(bookstore);

    return true;
  }

  /**
   * Add a book to bookstore inventory
   */
  public addBook(
    bookstoreId: EntityId,
    bookId: string,
    initialStock: number,
    price: number
  ): void {
    const bookstore = this.bookstores.get(bookstoreId);
    if (!bookstore) {
      return;
    }

    const existing = bookstore.inventory.get(bookId);
    if (existing) {
      existing.stock += initialStock;
    } else {
      bookstore.inventory.set(bookId, {
        bookId,
        stock: initialStock,
        price,
        sold: 0,
        revenue: 0,
      });
    }
  }

  /**
   * Restock a book
   */
  public restockBook(
    bookstoreId: EntityId,
    bookId: string,
    quantity: number
  ): void {
    const bookstore = this.bookstores.get(bookstoreId);
    if (!bookstore) {
      return;
    }

    const item = bookstore.inventory.get(bookId);
    if (!item) {
      return;
    }

    item.stock += quantity;
    const newStock = item.stock;

    this.events.emit('bookstore:restocked', {
      bookstoreId,
      bookId,
      quantityAdded: quantity,
      newStock,
    });
  }

  /**
   * Check inventory and auto-restock low items
   */
  private checkAndRestock(
    bookstore: BookstoreData,
    currentTick: number
  ): void {
    // Only restock every 1000 ticks (configurable)
    if (currentTick - bookstore.lastRestockTick < 1000) {
      return;
    }

    bookstore.lastRestockTick = currentTick;

    // Check each book in inventory
    for (const [bookId, item] of bookstore.inventory.entries()) {
      // Restock if below threshold (e.g., 5 books)
      if (item.stock < 5) {
        const restockAmount = 10; // Restock to 10
        this.restockBook(bookstore.bookstoreId, bookId, restockAmount);
      }
    }
  }

  /**
   * Check for revenue milestones
   */
  private checkRevenueMilestones(bookstore: BookstoreData): void {
    for (const milestone of this.revenueMilestones) {
      if (
        bookstore.totalRevenue >= milestone &&
        bookstore.totalRevenue - milestone < 100
      ) {
        // Just crossed milestone
        this.events.emit('bookstore:revenue_milestone', {
          bookstoreId: bookstore.bookstoreId,
          totalRevenue: bookstore.totalRevenue,
          milestone,
        });
      }
    }
  }

  /**
   * Get bookstore inventory
   */
  public getInventory(bookstoreId: EntityId): Map<string, BookInventory> {
    const bookstore = this.bookstores.get(bookstoreId);
    return bookstore?.inventory || new Map();
  }

  /**
   * Get bookstore total revenue
   */
  public getTotalRevenue(bookstoreId: EntityId): number {
    const bookstore = this.bookstores.get(bookstoreId);
    return bookstore?.totalRevenue || 0;
  }

  /**
   * Get books currently in stock
   */
  public getAvailableBooks(bookstoreId: EntityId): BookInventory[] {
    const bookstore = this.bookstores.get(bookstoreId);
    if (!bookstore) {
      return [];
    }

    const available: BookInventory[] = [];
    for (const item of bookstore.inventory.values()) {
      if (item.stock > 0) {
        available.push(item);
      }
    }
    return available;
  }

  /**
   * Get current tick from world (helper)
   */
  private getCurrentTick(_world: World): number {
    void _world; // Parameter for future use with TimeComponent singleton
    return 0;
  }

  public onAddEntity(world: World, entity: Entity): void {
    // Initialize new bookstore
    const bookstoreId = entity.id;
    if (!this.bookstores.has(bookstoreId)) {
      this.bookstores.set(bookstoreId, {
        bookstoreId,
        inventory: new Map(),
        totalRevenue: 0,
        lastRestockTick: this.getCurrentTick(world),
      });
    }
  }

  public onRemoveEntity(_world: World, entity: Entity): void {
    // Clean up bookstore data
    this.bookstores.delete(entity.id);
  }
}
