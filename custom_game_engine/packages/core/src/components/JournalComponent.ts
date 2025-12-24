import { ComponentBase } from '../ecs/Component.js';

export interface JournalEntry {
  readonly id: string;
  readonly text: string;
  readonly timestamp: number;
  readonly memoryIds: readonly string[]; // Episodic memories referenced
  readonly topics: readonly string[]; // Topics covered
  readonly discoverable: boolean; // Can other agents find it?
  readonly privacy: 'public' | 'private';
}

interface JournalEntryInput {
  text: string;
  timestamp: number;
  memoryIds: string[];
  topics?: string[];
  discoverable?: boolean;
  privacy?: 'public' | 'private';
}

/**
 * JournalComponent stores written journal entries
 */
export class JournalComponent extends ComponentBase {
  public readonly type = 'journal';
  private _entries: JournalEntry[] = [];

  constructor(_data?: {}) {
    super();
    // JournalComponent has no initialization data
  }

  /**
   * Get all journal entries (readonly)
   */
  get entries(): readonly JournalEntry[] {
    return Object.freeze([...this._entries]);
  }

  /**
   * Add a new journal entry
   */
  addEntry(input: JournalEntryInput): JournalEntry {
    if (!input.text) {
      throw new Error('Journal entry requires text');
    }
    if (input.timestamp === undefined) {
      throw new Error('Journal entry requires timestamp');
    }
    if (!input.memoryIds) {
      throw new Error('Journal entry requires memoryIds');
    }

    const entry: JournalEntry = Object.freeze({
      id: this._generateId(),
      text: input.text,
      timestamp: input.timestamp,
      memoryIds: Object.freeze([...input.memoryIds]),
      topics: input.topics
        ? Object.freeze([...input.topics])
        : Object.freeze([]),
      discoverable: input.discoverable ?? true,
      privacy: input.privacy ?? 'private',
    });

    this._entries.push(entry);
    return entry;
  }

  /**
   * Get recent entries
   */
  getRecent(limit: number = 10): readonly JournalEntry[] {
    return this._entries
      .slice(-limit)
      .reverse();
  }

  /**
   * Get discoverable entries
   */
  getDiscoverable(): readonly JournalEntry[] {
    return this._entries.filter((e) => e.discoverable);
  }

  private _generateId(): string {
    return `journal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
