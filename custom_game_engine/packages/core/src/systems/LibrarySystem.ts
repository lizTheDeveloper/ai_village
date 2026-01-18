import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus as CoreEventBus } from '../events/EventBus.js';
import type { EntityId } from '../types.js';
import type { LibraryComponent } from '../components/LibraryComponent.js';

interface BorrowedBook {
  bookId: string;
  borrowerId: EntityId;
  libraryId: EntityId;
  borrowedTick: number;
  dueDate: number;
}

interface ReadingSession {
  readerId: EntityId;
  libraryId: EntityId;
  bookId: string;
  startTick: number;
  duration: number;
}

/**
 * LibrarySystem manages public and private libraries
 *
 * Handles library operations, access control, and reading statistics.
 *
 * Responsibilities:
 * - Track borrowed books
 * - Process book returns
 * - Track reading sessions
 * - Enforce access control
 * - Emit library events
 */
export class LibrarySystem extends BaseSystem {
  public readonly id: SystemId = 'library';
  public readonly priority = 45;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Library];

  // Borrowed books tracking (bookId → BorrowedBook)
  private borrowedBooks: Map<string, BorrowedBook> = new Map();

  // Active reading sessions
  private readingSessions: Map<string, ReadingSession> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = this.getCurrentTick(ctx.world);

    // Check for overdue books
    for (const borrowed of this.borrowedBooks.values()) {
      if (currentTick > borrowed.dueDate) {
        // Could emit overdue event or apply fines here
      }
    }

    // Process active reading sessions
    for (const [sessionId, session] of this.readingSessions.entries()) {
      session.duration += ctx.deltaTime;

      // End sessions after some time (could be configurable)
      if (session.duration >= 3600) {
        // 1 hour of game time
        this.endReadingSession(sessionId, session);
      }
    }
  }

  /**
   * Borrow a book from a library
   */
  public borrowBook(
    libraryId: EntityId,
    borrowerId: EntityId,
    bookId: string,
    loanDuration: number
  ): boolean {
    // Check if book is already borrowed
    if (this.borrowedBooks.has(bookId)) {
      return false;
    }

    const currentTick = 0; // Would get from world
    const dueDate = currentTick + loanDuration;

    const borrowed: BorrowedBook = {
      bookId,
      borrowerId,
      libraryId,
      borrowedTick: currentTick,
      dueDate,
    };

    this.borrowedBooks.set(bookId, borrowed);

    this.events.emit('library:book_borrowed', {
      libraryId,
      borrowerId,
      bookId,
      dueDate,
    });

    return true;
  }

  /**
   * Return a borrowed book
   */
  public returnBook(
    libraryId: EntityId,
    borrowerId: EntityId,
    bookId: string
  ): boolean {
    const borrowed = this.borrowedBooks.get(bookId);
    if (!borrowed || borrowed.borrowerId !== borrowerId) {
      return false;
    }

    const currentTick = 0; // Would get from world
    const daysOverdue =
      currentTick > borrowed.dueDate ? currentTick - borrowed.dueDate : 0;

    this.borrowedBooks.delete(bookId);

    this.events.emit('library:book_returned', {
      libraryId,
      borrowerId,
      bookId,
      daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
    });

    return true;
  }

  /**
   * Start a reading session at the library
   */
  public startReadingSession(
    libraryId: EntityId,
    readerId: EntityId,
    bookId: string
  ): string {
    const sessionId = `reading_${readerId}_${Date.now()}`;
    const currentTick = 0; // Would get from world

    const session: ReadingSession = {
      readerId,
      libraryId,
      bookId,
      startTick: currentTick,
      duration: 0,
    };

    this.readingSessions.set(sessionId, session);

    return sessionId;
  }

  /**
   * End a reading session
   */
  private endReadingSession(sessionId: string, session: ReadingSession): void {
    this.events.emit('library:reading', {
      libraryId: session.libraryId,
      readerId: session.readerId,
      bookId: session.bookId,
      duration: session.duration,
    });

    this.readingSessions.delete(sessionId);
  }

  /**
   * Check if an agent has access to a library
   */
  public checkAccess(
    libraryId: EntityId,
    _agentId: EntityId,
    world: World
  ): boolean {
    // Get library entity and check access rules
    const library = world.getEntity(libraryId);
    if (!library) {
      return false;
    }

    const libraryComp = library.getComponent<LibraryComponent>(CT.Library);
    if (!libraryComp) {
      return false;
    }

    // Check if library is public
    if (libraryComp.publicAccess) {
      return true;
    }

    // Check if agent is authorized (could check permissions, memberships, etc.)
    // For now, allow all access
    return true;
  }

  /**
   * Deny access to a library
   */
  public denyAccess(
    libraryId: EntityId,
    agentId: EntityId,
    reason: string
  ): void {
    this.events.emit('library:access_denied', {
      libraryId,
      agentId,
      reason,
    });
  }

  /**
   * Get all books currently borrowed from a library
   */
  public getBorrowedBooks(libraryId: EntityId): BorrowedBook[] {
    const borrowed: BorrowedBook[] = [];
    for (const book of this.borrowedBooks.values()) {
      if (book.libraryId === libraryId) {
        borrowed.push(book);
      }
    }
    return borrowed;
  }

  /**
   * Get books borrowed by a specific agent
   */
  public getAgentBorrowedBooks(borrowerId: EntityId): BorrowedBook[] {
    const borrowed: BorrowedBook[] = [];
    for (const book of this.borrowedBooks.values()) {
      if (book.borrowerId === borrowerId) {
        borrowed.push(book);
      }
    }
    return borrowed;
  }

  /**
   * Get current tick from world (helper)
   */
  private getCurrentTick(_world: World): number {
    // Would get from TimeComponent singleton
    return 0;
  }

  public onAddEntity(_world: World, _entity: Entity): void {
    // Track new library
  }

  public onRemoveEntity(_world: World, _entity: Entity): void {
    // Clean up library data
  }
}
