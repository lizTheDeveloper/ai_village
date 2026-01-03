import type { Component } from '../ecs/Component.js';

/**
 * BookstoreComponent - Commercial book retail establishment
 *
 * Unlocked by: bookstores technology (Tier 0e+)
 * Requires: 4 of 5 papers from publishing_industry set
 *
 * Bookstores sell books to agents, enabling knowledge distribution through
 * commercial channels. They work with printing partners to stock inventory.
 */

export interface BookForSale {
  /** Unique ID of the book */
  bookId: string;
  /** Title of the book */
  title: string;
  /** Author entity ID */
  authorId?: string;
  /** Publisher entity ID */
  publisherId?: string;
  /** Base production cost */
  cost: number;
  /** Sale price (cost + markup) */
  price: number;
  /** Copies in stock */
  stock: number;
  /** Copies sold */
  sold: number;
  /** Research paper IDs contained in this book */
  paperIds?: string[];
  /** Whether this is a biography */
  isBiography?: boolean;
}

export interface BookstoreComponent extends Component {
  type: 'bookstore';

  /** Books available for sale */
  booksForSale: BookForSale[];

  /** Owner entity ID */
  ownerId: string;

  /** Total revenue earned */
  revenue: number;

  /** Markup percentage (e.g., 50 = 50% markup) */
  markupPercentage: number;

  /** Printing company entity IDs that supply this store */
  printingPartners: string[];

  /** Can order custom books from partners */
  canOrderCustom: boolean;

  /** Orders placed but not yet fulfilled */
  pendingOrders: PendingOrder[];

  /** Daily customer count */
  customersPerDay: number;

  /** Most popular books (bookId -> purchase count) */
  popularBooks: Map<string, number>;
}

export interface PendingOrder {
  /** Order ID */
  orderId: string;
  /** Book ID being ordered */
  bookId: string;
  /** Number of copies ordered */
  quantity: number;
  /** Printing partner fulfilling the order */
  printerId: string;
  /** When the order was placed */
  orderTick: number;
  /** When the order will be ready */
  fulfillmentTick: number;
}

export function createBookstoreComponent(ownerId: string): BookstoreComponent {
  if (!ownerId) {
    throw new Error('Bookstore requires ownerId');
  }

  return {
    type: 'bookstore',
    version: 1,
    booksForSale: [],
    ownerId,
    revenue: 0,
    markupPercentage: 50, // 50% markup by default
    printingPartners: [],
    canOrderCustom: false,
    pendingOrders: [],
    customersPerDay: 0,
    popularBooks: new Map(),
  };
}

/**
 * Add a book to the store's inventory
 */
export function addBookToStore(
  bookstore: BookstoreComponent,
  bookId: string,
  title: string,
  cost: number,
  stock: number,
  authorId?: string,
  publisherId?: string,
  paperIds?: string[],
  isBiography?: boolean
): void {
  if (cost <= 0) {
    throw new RangeError(`Book cost must be positive, got ${cost}`);
  }
  if (stock < 0) {
    throw new RangeError(`Book stock cannot be negative, got ${stock}`);
  }

  // Check if book already exists
  const existing = bookstore.booksForSale.find((b) => b.bookId === bookId);
  if (existing) {
    // Just add to stock
    existing.stock += stock;
    return;
  }

  // Calculate price with markup
  const price = cost * (1 + bookstore.markupPercentage / 100);

  bookstore.booksForSale.push({
    bookId,
    title,
    authorId,
    publisherId,
    cost,
    price,
    stock,
    sold: 0,
    paperIds,
    isBiography,
  });

  // Initialize popularity tracking
  bookstore.popularBooks.set(bookId, 0);
}

/**
 * Purchase a book from the store
 * @returns true if purchase successful, false if out of stock
 */
export function purchaseBook(
  bookstore: BookstoreComponent,
  bookId: string
): boolean {
  const book = bookstore.booksForSale.find((b) => b.bookId === bookId);
  if (!book) {
    throw new Error(`Book ${bookId} not found in bookstore`);
  }

  if (book.stock <= 0) {
    return false;
  }

  // Reduce stock
  book.stock--;
  book.sold++;

  // Update revenue (profit = price - cost)
  const profit = book.price - book.cost;
  bookstore.revenue += profit;

  // Update popularity
  const currentPopularity = bookstore.popularBooks.get(bookId) ?? 0;
  bookstore.popularBooks.set(bookId, currentPopularity + 1);

  return true;
}

/**
 * Place an order with a printing partner
 */
export function placeOrder(
  bookstore: BookstoreComponent,
  bookId: string,
  quantity: number,
  printerId: string,
  currentTick: number,
  fulfillmentDelay: number = 100
): string {
  if (!bookstore.printingPartners.includes(printerId)) {
    throw new Error(`Printer ${printerId} is not a partner of this bookstore`);
  }

  const orderId = `order_${currentTick}_${bookId}`;
  bookstore.pendingOrders.push({
    orderId,
    bookId,
    quantity,
    printerId,
    orderTick: currentTick,
    fulfillmentTick: currentTick + fulfillmentDelay,
  });

  return orderId;
}

/**
 * Fulfill a pending order (add books to stock)
 */
export function fulfillOrder(
  bookstore: BookstoreComponent,
  orderId: string,
  cost: number
): void {
  const orderIndex = bookstore.pendingOrders.findIndex(
    (o) => o.orderId === orderId
  );
  if (orderIndex === -1) {
    throw new Error(`Order ${orderId} not found`);
  }

  const order = bookstore.pendingOrders[orderIndex]!; // Safe: we checked orderIndex is valid

  // Find the book and add stock
  const book = bookstore.booksForSale.find((b) => b.bookId === order.bookId);
  if (book) {
    book.stock += order.quantity;
    book.cost = cost; // Update cost
    book.price = cost * (1 + bookstore.markupPercentage / 100); // Recalculate price
  }

  // Remove from pending orders
  bookstore.pendingOrders.splice(orderIndex, 1);
}

/**
 * Add a printing partner
 */
export function addPrintingPartner(
  bookstore: BookstoreComponent,
  printerId: string
): void {
  if (!bookstore.printingPartners.includes(printerId)) {
    bookstore.printingPartners.push(printerId);
  }
}

/**
 * Get books available for purchase (in stock)
 */
export function getAvailableBooks(
  bookstore: BookstoreComponent
): BookForSale[] {
  return bookstore.booksForSale.filter((book) => book.stock > 0);
}

/**
 * Get most popular books
 */
export function getMostPopularBooks(
  bookstore: BookstoreComponent,
  limit: number = 10
): BookForSale[] {
  return bookstore.booksForSale
    .filter((book) => (bookstore.popularBooks.get(book.bookId) ?? 0) > 0)
    .sort(
      (a, b) =>
        (bookstore.popularBooks.get(b.bookId) ?? 0) -
        (bookstore.popularBooks.get(a.bookId) ?? 0)
    )
    .slice(0, limit);
}
