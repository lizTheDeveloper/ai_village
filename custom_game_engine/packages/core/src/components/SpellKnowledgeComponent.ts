/**
 * SpellKnowledgeComponent - Tracks known spells and proficiency
 *
 * Split from MagicComponent Phase 2 - focused component for spell knowledge.
 *
 * Handles:
 * - Known spells with proficiency tracking
 * - Technique and form proficiencies
 * - Active sustained effects
 * - Known paradigms
 */

import type { Component } from '../ecs/Component.js';
import type { MagicTechnique, MagicForm } from './MagicComponent.js';

/**
 * A known spell with proficiency tracking
 */
export interface KnownSpell {
  spellId: string;
  proficiency: number;  // 0-100, affects success rate
  timesCast: number;
  lastCast?: number;    // game tick
}

/**
 * Tracks spell knowledge and proficiency for magic users.
 *
 * Proficiency increases with practice, affecting:
 * - Cast success rate
 * - Mana cost reduction
 * - Effect magnitude
 */
export interface SpellKnowledgeComponent extends Component {
  type: 'spell_knowledge';

  /** Spells this entity knows */
  knownSpells: KnownSpell[];

  /** Paradigms this entity has learned to use */
  knownParadigmIds: string[];

  /** Currently active sustained effects (spell IDs) */
  activeEffects: string[];

  /** Technique proficiencies (0-100) */
  techniqueProficiency: Partial<Record<MagicTechnique, number>>;

  /** Form proficiencies (0-100) */
  formProficiency: Partial<Record<MagicForm, number>>;
}

/**
 * Create a default SpellKnowledgeComponent with no spells.
 */
export function createSpellKnowledgeComponent(): SpellKnowledgeComponent {
  return {
    type: 'spell_knowledge',
    version: 1,
    knownSpells: [],
    knownParadigmIds: [],
    activeEffects: [],
    techniqueProficiency: {},
    formProficiency: {},
  };
}

/**
 * Create a SpellKnowledgeComponent with a specific paradigm.
 */
export function createSpellKnowledgeComponentWithParadigm(
  paradigmId: string
): SpellKnowledgeComponent {
  return {
    type: 'spell_knowledge',
    version: 1,
    knownSpells: [],
    knownParadigmIds: [paradigmId],
    activeEffects: [],
    techniqueProficiency: {},
    formProficiency: {},
  };
}

/**
 * Check if entity knows a spell.
 */
export function knowsSpell(component: SpellKnowledgeComponent, spellId: string): boolean {
  return component.knownSpells.some(s => s.spellId === spellId);
}

/**
 * Get proficiency for a specific spell.
 */
export function getSpellProficiency(component: SpellKnowledgeComponent, spellId: string): number {
  const spell = component.knownSpells.find(s => s.spellId === spellId);
  return spell?.proficiency ?? 0;
}
