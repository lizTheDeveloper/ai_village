/**
 * Serializer for JournalComponent - properly reconstructs class instance
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { JournalComponent, type JournalEntry } from '@ai-village/core';

interface SerializedJournal {
  entries: JournalEntry[];
}

export class JournalSerializer extends BaseComponentSerializer<JournalComponent> {
  constructor() {
    super('journal', 1);
  }

  protected serializeData(component: JournalComponent): SerializedJournal {
    // Access private _entries field
    const componentAny = component as unknown as { type: string; version: number; _entries: JournalEntry[] };
    const entries = componentAny._entries;
    if (!Array.isArray(entries)) {
      throw new Error('JournalComponent missing _entries array during serialization');
    }
    return {
      entries,
    };
  }

  protected deserializeData(data: unknown): JournalComponent {
    const serialized = data as SerializedJournal;

    // Validate required fields - throw on missing data per CLAUDE.md
    if (!Array.isArray(serialized.entries)) {
      throw new Error('JournalSerializer: missing required field "entries"');
    }

    // Create new component instance
    const component = new JournalComponent();

    // Restore entries by accessing private field
    // Validation already ensures entries array exists - no fallback needed
    const componentAny = component as unknown as { type: string; version: number; _entries: JournalEntry[] };
    componentAny._entries = serialized.entries;

    return component;
  }

  validate(data: unknown): data is JournalComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('JournalComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.entries)) {
      throw new Error('JournalComponent missing required entries array');
    }
    return true;
  }
}
