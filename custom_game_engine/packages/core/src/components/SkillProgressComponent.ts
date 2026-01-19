/**
 * SkillProgressComponent - Tracks skill tree progression per paradigm
 *
 * Split from MagicComponent Phase 2 - focused component for skill trees.
 *
 * Handles:
 * - XP per paradigm
 * - Unlocked nodes per paradigm
 * - Node progress tracking
 * - Skill tree state
 */

import type { Component } from '../ecs/Component.js';

/**
 * State for tracking skill tree progression in a specific paradigm
 */
export interface SkillTreeParadigmState {
  /** Current available XP in this paradigm */
  xp: number;

  /** List of unlocked node IDs */
  unlockedNodes: string[];

  /** Progress toward each node (node ID -> progress value) */
  nodeProgress: Record<string, number>;
}

/**
 * Tracks skill tree progression per magic paradigm.
 *
 * Each paradigm (academic, divine, allomancy, etc.) has its own skill tree.
 * Agents earn XP by casting spells, which unlocks nodes that grant new spells/abilities.
 */
export interface SkillProgressComponent extends Component {
  type: 'skill_progress';

  /** Skill tree progression per paradigm */
  skillTreeState: Partial<Record<string, SkillTreeParadigmState>>;
}

/**
 * Create a default SkillProgressComponent with no progression.
 */
export function createSkillProgressComponent(): SkillProgressComponent {
  return {
    type: 'skill_progress',
    version: 1,
    skillTreeState: {},
  };
}

/**
 * Create a SkillProgressComponent with a specific paradigm initialized.
 */
export function createSkillProgressComponentWithParadigm(
  paradigmId: string,
  initialXP: number = 0
): SkillProgressComponent {
  return {
    type: 'skill_progress',
    version: 1,
    skillTreeState: {
      [paradigmId]: {
        xp: initialXP,
        unlockedNodes: [],
        nodeProgress: {},
      },
    },
  };
}

/**
 * Get XP for a specific paradigm.
 */
export function getParadigmXP(component: SkillProgressComponent, paradigmId: string): number {
  return component.skillTreeState[paradigmId]?.xp ?? 0;
}

/**
 * Get unlocked nodes for a specific paradigm.
 */
export function getUnlockedNodes(component: SkillProgressComponent, paradigmId: string): string[] {
  return component.skillTreeState[paradigmId]?.unlockedNodes ?? [];
}

/**
 * Check if a node is unlocked in a specific paradigm.
 */
export function isNodeUnlocked(component: SkillProgressComponent, paradigmId: string, nodeId: string): boolean {
  const state = component.skillTreeState[paradigmId];
  return state?.unlockedNodes.includes(nodeId) ?? false;
}
