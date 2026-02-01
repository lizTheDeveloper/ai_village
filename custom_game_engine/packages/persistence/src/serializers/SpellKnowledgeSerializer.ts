/**
 * Serializer for SpellKnowledgeComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { SpellKnowledgeComponent } from '@ai-village/core';
import { createSpellKnowledgeComponent } from '@ai-village/core';

export class SpellKnowledgeSerializer extends BaseComponentSerializer<SpellKnowledgeComponent> {
  constructor() {
    super('spell_knowledge', 1);
  }

  protected serializeData(component: SpellKnowledgeComponent): Record<string, unknown> {
    return {
      knownSpells: component.knownSpells,
      knownParadigmIds: component.knownParadigmIds,
      activeEffects: component.activeEffects,
      techniqueProficiency: component.techniqueProficiency,
      formProficiency: component.formProficiency,
    };
  }

  protected deserializeData(data: unknown): SpellKnowledgeComponent {
    const d = data as Record<string, unknown>;
    const comp = createSpellKnowledgeComponent();
    // Validation already ensures these arrays exist - no fallbacks needed
    comp.knownSpells = d.knownSpells as Array<{ spellId: string; proficiency: number; timesCast: number; lastCast?: number }>;
    comp.knownParadigmIds = d.knownParadigmIds as string[];
    comp.activeEffects = d.activeEffects as string[];
    comp.techniqueProficiency = d.techniqueProficiency as SpellKnowledgeComponent['techniqueProficiency'];
    comp.formProficiency = d.formProficiency as SpellKnowledgeComponent['formProficiency'];
    return comp;
  }

  validate(data: unknown): data is SpellKnowledgeComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('SpellKnowledgeComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.knownSpells)) {
      throw new Error('SpellKnowledgeComponent missing required knownSpells array');
    }
    if (!Array.isArray(d.knownParadigmIds)) {
      throw new Error('SpellKnowledgeComponent missing required knownParadigmIds array');
    }
    if (!Array.isArray(d.activeEffects)) {
      throw new Error('SpellKnowledgeComponent missing required activeEffects array');
    }
    if (typeof d.techniqueProficiency !== 'object' || d.techniqueProficiency === null) {
      throw new Error('SpellKnowledgeComponent missing required techniqueProficiency object');
    }
    if (typeof d.formProficiency !== 'object' || d.formProficiency === null) {
      throw new Error('SpellKnowledgeComponent missing required formProficiency object');
    }
    return true;
  }
}
