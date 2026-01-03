import type { Component } from '../ecs/Component.js';

/**
 * LibraryComponent - Public library for storing and accessing manuscripts and books
 *
 * Unlocked by: public_libraries technology (Tier 0a)
 * Requires: 1 of 2 papers from writing_systems set
 *
 * Libraries provide public access to written knowledge, enabling agents to read
 * research papers, manuscripts, and books without owning personal copies.
 */

export interface BookListing {
  /** Unique ID of the book/manuscript */
  itemId: string;
  /** Title of the work */
  title: string;
  /** Author entity ID */
  authorId?: string;
  /** When it was added to the library */
  acquisitionTick: number;
  /** How many times it's been read */
  readCount: number;
}

export interface LibraryComponent extends Component {
  type: 'library';

  /** Manuscripts stored in the library */
  manuscripts: string[];

  /** Books stored in the library */
  books: string[];

  /** Maximum number of items the library can hold */
  capacity: number;

  /** Whether anyone can access (true) or only members (false) */
  publicAccess: boolean;

  /** Cost to become a member (if not public) */
  membershipFee?: number;

  /** Members who can access if not public */
  memberIds?: string[];

  /** Librarian entity ID (optional) */
  librarianId?: string;

  /** Daily visit statistics */
  visitsPerDay: number;

  /** Most read items (itemId -> read count) */
  mostReadItems: Map<string, number>;

  /** Catalog for tracking all items */
  catalog: BookListing[];
}

export function createLibraryComponent(
  capacity: number = 500,
  publicAccess: boolean = true
): LibraryComponent {
  if (capacity <= 0) {
    throw new RangeError(`Library capacity must be positive, got ${capacity}`);
  }

  return {
    type: 'library',
    version: 1,
    manuscripts: [],
    books: [],
    capacity,
    publicAccess,
    membershipFee: publicAccess ? undefined : 10,
    memberIds: publicAccess ? undefined : [],
    librarianId: undefined,
    visitsPerDay: 0,
    mostReadItems: new Map(),
    catalog: [],
  };
}

/**
 * Add an item to the library catalog
 */
export function addItemToLibrary(
  library: LibraryComponent,
  itemId: string,
  title: string,
  authorId: string | undefined,
  currentTick: number,
  isManuscript: boolean
): void {
  // Check capacity
  const totalItems = library.manuscripts.length + library.books.length;
  if (totalItems >= library.capacity) {
    throw new Error(`Library at capacity (${library.capacity})`);
  }

  // Add to appropriate list
  if (isManuscript) {
    if (library.manuscripts.includes(itemId)) {
      throw new Error(`Manuscript ${itemId} already in library`);
    }
    library.manuscripts.push(itemId);
  } else {
    if (library.books.includes(itemId)) {
      throw new Error(`Book ${itemId} already in library`);
    }
    library.books.push(itemId);
  }

  // Add to catalog
  library.catalog.push({
    itemId,
    title,
    authorId,
    acquisitionTick: currentTick,
    readCount: 0,
  });

  // Initialize read count
  library.mostReadItems.set(itemId, 0);
}

/**
 * Record that an agent read an item
 */
export function recordRead(library: LibraryComponent, itemId: string): void {
  const currentCount = library.mostReadItems.get(itemId) ?? 0;
  library.mostReadItems.set(itemId, currentCount + 1);

  // Update catalog
  const catalogEntry = library.catalog.find((entry) => entry.itemId === itemId);
  if (catalogEntry) {
    catalogEntry.readCount++;
  }
}

/**
 * Check if an agent can access the library
 */
export function canAccessLibrary(
  library: LibraryComponent,
  agentId: string
): boolean {
  if (library.publicAccess) return true;
  if (!library.memberIds) return false;
  return library.memberIds.includes(agentId);
}

/**
 * Add a member to the library (if membership required)
 */
export function addMember(library: LibraryComponent, agentId: string): void {
  if (library.publicAccess) {
    throw new Error('Cannot add members to public library');
  }
  if (!library.memberIds) {
    library.memberIds = [];
  }
  if (!library.memberIds.includes(agentId)) {
    library.memberIds.push(agentId);
  }
}
