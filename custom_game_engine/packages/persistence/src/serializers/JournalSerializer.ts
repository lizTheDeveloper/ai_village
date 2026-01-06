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
    const componentAny = component as unknown as { _entries: JournalEntry[] };
    return {
      entries: componentAny._entries ?? [],
    };
  }

  protected deserializeData(data: unknown): JournalComponent {
    const serialized = data as SerializedJournal;

    // Create new component instance
    const component = new JournalComponent();

    // Restore entries by accessing private field
    const componentAny = component as unknown as { _entries: JournalEntry[] };
    componentAny._entries = serialized.entries ?? [];

    return component;
  }

  validate(data: unknown): data is JournalComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('JournalComponent data must be object');
    }
    return true;
  }
}
