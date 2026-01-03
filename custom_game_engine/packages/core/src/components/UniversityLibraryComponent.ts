import type { Component } from '../ecs/Component.js';

/**
 * UniversityLibraryComponent - Academic research library with journal subscriptions
 *
 * Unlocked by: university_libraries technology (Tier 0f+)
 * Requires: 3 of 4 papers from academic_publishing set
 *
 * University libraries provide advanced research infrastructure including:
 * - Journal subscriptions (access to latest research)
 * - Reference librarian support
 * - Student and faculty access
 * - Optional public access
 */

export interface JournalSubscription {
  /** Journal entity ID */
  journalId: string;
  /** Journal name */
  journalName: string;
  /** Annual subscription cost */
  annualCost: number;
  /** When subscription started */
  subscribedSince: number;
  /** Issues received */
  issuesReceived: string[];
  /** Whether subscription is active */
  active: boolean;
}

export interface LibraryHolding {
  /** Item ID (manuscript, book, journal issue) */
  itemId: string;
  /** Item title */
  title: string;
  /** Item type */
  type: 'manuscript' | 'book' | 'journal_issue';
  /** Author/editor entity ID */
  authorId?: string;
  /** Publisher entity ID */
  publisherId?: string;
  /** When acquired */
  acquisitionTick: number;
  /** Read count */
  readCount: number;
  /** Research paper IDs contained */
  paperIds?: string[];
}

export interface UniversityLibraryComponent extends Component {
  type: 'university_library';

  /** Manuscripts in collection */
  manuscripts: string[];

  /** Books in collection */
  books: string[];

  /** Maximum items */
  capacity: number;

  /** Active journal subscriptions */
  journalSubscriptions: JournalSubscription[];

  /** Total annual subscription cost */
  subscriptionCost: number;

  /** University entity ID that owns this library */
  universityId: string;

  /** Students can access (usually true) */
  studentAccess: boolean;

  /** Public can access (varies) */
  publicAccess: boolean;

  /** Reference librarian entity IDs */
  referenceLibrarians: string[];

  /** Complete catalog of holdings */
  catalog: LibraryHolding[];

  /** Reading room capacity (max concurrent readers) */
  readingRoomCapacity: number;

  /** Current readers in the library */
  currentReaders: string[];

  /** Statistics */
  dailyVisits: number;
  mostAccessedItems: Map<string, number>;
}

export function createUniversityLibraryComponent(
  universityId: string,
  capacity: number = 2000,
  readingRoomCapacity: number = 50
): UniversityLibraryComponent {
  if (!universityId) {
    throw new Error('University library requires universityId');
  }
  if (capacity <= 0) {
    throw new RangeError(
      `University library capacity must be positive, got ${capacity}`
    );
  }
  if (readingRoomCapacity <= 0) {
    throw new RangeError(
      `Reading room capacity must be positive, got ${readingRoomCapacity}`
    );
  }

  return {
    type: 'university_library',
    version: 1,
    manuscripts: [],
    books: [],
    capacity,
    journalSubscriptions: [],
    subscriptionCost: 0,
    universityId,
    studentAccess: true,
    publicAccess: false, // Usually restricted to university members
    referenceLibrarians: [],
    catalog: [],
    readingRoomCapacity,
    currentReaders: [],
    dailyVisits: 0,
    mostAccessedItems: new Map(),
  };
}

/**
 * Subscribe to a journal
 */
export function subscribeToJournal(
  library: UniversityLibraryComponent,
  journalId: string,
  journalName: string,
  annualCost: number,
  currentTick: number
): void {
  if (annualCost < 0) {
    throw new RangeError(`Journal cost cannot be negative, got ${annualCost}`);
  }

  // Check if already subscribed
  const existing = library.journalSubscriptions.find(
    (sub) => sub.journalId === journalId
  );
  if (existing) {
    if (!existing.active) {
      // Reactivate subscription
      existing.active = true;
      library.subscriptionCost += annualCost;
    }
    return;
  }

  library.journalSubscriptions.push({
    journalId,
    journalName,
    annualCost,
    subscribedSince: currentTick,
    issuesReceived: [],
    active: true,
  });

  library.subscriptionCost += annualCost;
}

/**
 * Cancel a journal subscription
 */
export function cancelSubscription(
  library: UniversityLibraryComponent,
  journalId: string
): void {
  const subscription = library.journalSubscriptions.find(
    (sub) => sub.journalId === journalId
  );
  if (!subscription) {
    throw new Error(`Journal ${journalId} not found in subscriptions`);
  }

  subscription.active = false;
  library.subscriptionCost -= subscription.annualCost;
}

/**
 * Receive a journal issue
 */
export function receiveJournalIssue(
  library: UniversityLibraryComponent,
  journalId: string,
  issueId: string,
  issueTitle: string,
  paperIds: string[],
  currentTick: number
): void {
  const subscription = library.journalSubscriptions.find(
    (sub) => sub.journalId === journalId && sub.active
  );
  if (!subscription) {
    throw new Error(
      `No active subscription for journal ${journalId}, cannot receive issue`
    );
  }

  // Add to subscription
  subscription.issuesReceived.push(issueId);

  // Add to catalog
  library.catalog.push({
    itemId: issueId,
    title: issueTitle,
    type: 'journal_issue',
    publisherId: journalId,
    acquisitionTick: currentTick,
    readCount: 0,
    paperIds,
  });

  // Initialize access tracking
  library.mostAccessedItems.set(issueId, 0);
}

/**
 * Add a book or manuscript to the library
 */
export function addHolding(
  library: UniversityLibraryComponent,
  itemId: string,
  title: string,
  type: 'manuscript' | 'book',
  currentTick: number,
  authorId?: string,
  publisherId?: string,
  paperIds?: string[]
): void {
  // Check capacity
  const totalItems = library.manuscripts.length + library.books.length;
  if (totalItems >= library.capacity) {
    throw new Error(`University library at capacity (${library.capacity})`);
  }

  // Add to appropriate list
  if (type === 'manuscript') {
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
    type,
    authorId,
    publisherId,
    acquisitionTick: currentTick,
    readCount: 0,
    paperIds,
  });

  // Initialize access tracking
  library.mostAccessedItems.set(itemId, 0);
}

/**
 * Record that an agent accessed an item
 */
export function recordAccess(
  library: UniversityLibraryComponent,
  itemId: string
): void {
  const currentCount = library.mostAccessedItems.get(itemId) ?? 0;
  library.mostAccessedItems.set(itemId, currentCount + 1);

  // Update catalog
  const holding = library.catalog.find((h) => h.itemId === itemId);
  if (holding) {
    holding.readCount++;
  }
}

/**
 * Check if an agent can access the library
 */
export function canAccessUniversityLibrary(
  library: UniversityLibraryComponent,
  _agentId: string, // Reserved for future member tracking
  isStudent: boolean = false,
  isFaculty: boolean = false
): boolean {
  if (library.publicAccess) return true;
  if (library.studentAccess && (isStudent || isFaculty)) return true;
  return false;
}

/**
 * Enter the reading room
 * @returns true if successfully entered, false if at capacity
 */
export function enterReadingRoom(
  library: UniversityLibraryComponent,
  agentId: string
): boolean {
  if (library.currentReaders.length >= library.readingRoomCapacity) {
    return false;
  }
  if (!library.currentReaders.includes(agentId)) {
    library.currentReaders.push(agentId);
  }
  return true;
}

/**
 * Leave the reading room
 */
export function leaveReadingRoom(
  library: UniversityLibraryComponent,
  agentId: string
): void {
  const index = library.currentReaders.indexOf(agentId);
  if (index !== -1) {
    library.currentReaders.splice(index, 1);
  }
}

/**
 * Add a reference librarian
 */
export function addReferenceLibrarian(
  library: UniversityLibraryComponent,
  librarianId: string
): void {
  if (!library.referenceLibrarians.includes(librarianId)) {
    library.referenceLibrarians.push(librarianId);
  }
}

/**
 * Get all papers available through journal subscriptions
 */
export function getAvailablePapers(
  library: UniversityLibraryComponent
): string[] {
  const paperIds: string[] = [];

  // Collect from all catalog items
  for (const holding of library.catalog) {
    if (holding.paperIds) {
      paperIds.push(...holding.paperIds);
    }
  }

  return [...new Set(paperIds)]; // Remove duplicates
}
