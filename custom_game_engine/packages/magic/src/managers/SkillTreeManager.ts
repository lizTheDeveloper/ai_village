/**
 * SkillTreeManager - Manages magic skill tree progression and spell unlocks
 *
 * Handles:
 * - XP grants and tracking
 * - Node unlock logic
 * - Spell unlock from skill trees
 * - Progression queries
 * - Auto-unlock checks
 *
 * Extracted from MagicSystem to reduce god object complexity.
 */

import type { World } from '@ai-village/core/ecs/World.js';
import type { EntityImpl } from '@ai-village/core/ecs/Entity.js';
import type { EventBus } from '@ai-village/core/events/EventBus.js';
import { ComponentType as CT } from '@ai-village/core/types/ComponentType.js';
import type { MagicComponent } from '@ai-village/core/components/MagicComponent.js';
import { MagicSkillTreeRegistry } from '../MagicSkillTreeRegistry.js';
import { evaluateNode, type EvaluationContext } from '../MagicSkillTreeEvaluator.js';

/**
 * Manages skill tree progression for magic paradigms.
 *
 * Each paradigm (academic, divine, allomancy, etc.) has its own skill tree.
 * Agents earn XP by casting spells, which unlocks nodes that grant new spells/abilities.
 */
export class SkillTreeManager {
  private skillTreeRegistry: MagicSkillTreeRegistry;
  private world: World | null = null;
  private eventBus: EventBus | null = null;

  constructor() {
    this.skillTreeRegistry = MagicSkillTreeRegistry.getInstance();
  }

  /**
   * Initialize the manager with world and event bus references.
   */
  initialize(world: World, eventBus: EventBus): void {
    this.world = world;
    this.eventBus = eventBus;
  }

  // =========================================================================
  // XP Management
  // =========================================================================

  /**
   * Grant skill XP to an entity for a specific paradigm.
   *
   * @param entity The entity to grant XP to
   * @param paradigmId The paradigm to grant XP for (e.g., 'academic', 'divine')
   * @param xpAmount The amount of XP to grant
   */
  grantSkillXP(entity: EntityImpl, paradigmId: string, xpAmount: number): void {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return;

    // Update skill tree state in magic component
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const skillTreeState = current.skillTreeState ?? {};
      const paradigmState = skillTreeState[paradigmId] ?? { xp: 0, unlockedNodes: [], nodeProgress: {} };

      return {
        ...current,
        skillTreeState: {
          ...skillTreeState,
          [paradigmId]: {
            ...paradigmState,
            xp: paradigmState.xp + xpAmount,
          },
        },
      };
    });

    // Check for newly unlockable nodes
    this.checkSkillTreeUnlocks(entity, paradigmId);
  }

  // =========================================================================
  // Node Unlocking
  // =========================================================================

  /**
   * Check if any skill tree nodes can be unlocked with current XP.
   * Called automatically after granting XP.
   *
   * @param entity The entity to check unlocks for
   * @param paradigmId The paradigm to check
   */
  checkSkillTreeUnlocks(entity: EntityImpl, paradigmId: string): void {
    if (!this.world) return;

    const tree = this.skillTreeRegistry.getTree(paradigmId);
    if (!tree) return;

    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic?.skillTreeState?.[paradigmId]) return;

    const state = magic.skillTreeState[paradigmId];
    if (!state) return;

    // Build evaluation context
    const evalContext = this.buildEvaluationContext(entity, paradigmId, state);
    if (!evalContext) return;

    // Check each node for unlockability
    for (const node of tree.nodes) {
      // Skip already unlocked nodes
      if (state.unlockedNodes.includes(node.id)) continue;

      // Check if node can be unlocked
      const evaluation = evaluateNode(node, tree, evalContext);

      if (evaluation.canPurchase && evaluation.visible) {
        // Check if have enough XP
        if (state.xp >= node.xpCost) {
          // Auto-unlock available nodes (or could require player action)
          this.unlockSkillNode(entity, paradigmId, node.id, node.xpCost);
        }
      }
    }
  }

  /**
   * Unlock a skill tree node for an entity.
   *
   * @param entity The entity unlocking the node
   * @param paradigmId The paradigm tree
   * @param nodeId The node to unlock
   * @param xpCost The XP cost to unlock
   * @returns True if unlocked successfully
   */
  unlockSkillNode(entity: EntityImpl, paradigmId: string, nodeId: string, xpCost: number): boolean {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic?.skillTreeState?.[paradigmId]) return false;

    const state = magic.skillTreeState[paradigmId];
    if (!state || state.xp < xpCost) return false;
    if (state.unlockedNodes.includes(nodeId)) return false;

    // Deduct XP and add node to unlocked list
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const skillTreeState = current.skillTreeState ?? {};
      const paradigmState = skillTreeState[paradigmId] ?? { xp: 0, unlockedNodes: [], nodeProgress: {} };

      return {
        ...current,
        skillTreeState: {
          ...skillTreeState,
          [paradigmId]: {
            ...paradigmState,
            xp: paradigmState.xp - xpCost,
            unlockedNodes: [...paradigmState.unlockedNodes, nodeId],
          },
        },
      };
    });

    // Emit unlock event
    this.eventBus?.emit<'magic:skill_node_unlocked'>({
      type: 'magic:skill_node_unlocked',
      source: entity.id,
      data: {
        nodeId,
        agentId: entity.id,
        skillTree: paradigmId,
      },
    });

    return true;
  }

  /**
   * Handle when a skill node is unlocked.
   * Checks if the node grants spells and auto-learns them.
   *
   * This is called by event handlers in MagicSystem.
   *
   * @param entity The entity that unlocked the node
   * @param paradigmId The paradigm tree
   * @param nodeId The node that was unlocked
   * @param learnSpellCallback Callback to learn spells (from SpellProficiencyManager)
   */
  handleSkillNodeUnlocked(
    entity: EntityImpl,
    paradigmId: string,
    nodeId: string,
    learnSpellCallback: (entity: EntityImpl, spellId: string, proficiency: number) => void
  ): void {
    const node = this.skillTreeRegistry.getNode(paradigmId, nodeId);
    if (!node) return;

    // Check node effects for spell unlocks
    for (const effect of node.effects) {
      const spellId = effect.target?.spellId;
      if (effect.type === 'unlock_spell' && spellId) {
        // Auto-learn the unlocked spell
        learnSpellCallback(entity, spellId, effect.baseValue ?? 0);

        // Emit spell unlocked event
        this.eventBus?.emit<'magic:spell_unlocked_from_skill_tree'>({
          type: 'magic:spell_unlocked_from_skill_tree',
          source: entity.id,
          data: {
            spellId,
            agentId: entity.id,
            nodeId,
          },
        });
      }
    }
  }

  // =========================================================================
  // Requirements & Queries
  // =========================================================================

  /**
   * Check if an entity meets skill tree requirements for a spell.
   *
   * @param entity The entity to check
   * @param spell The spell to check requirements for
   * @returns True if requirements are met
   */
  checkSkillTreeRequirements(entity: EntityImpl, spell: { id: string; paradigmId?: string }): boolean {
    const paradigmId = spell.paradigmId ?? 'academic';
    const tree = this.skillTreeRegistry.getTree(paradigmId);
    if (!tree) return true; // No tree = no requirements

    // Find nodes that unlock this spell
    const unlockingNodes = tree.nodes.filter(node =>
      node.effects.some(e => e.type === 'unlock_spell' && e.target?.spellId === spell.id)
    );

    if (unlockingNodes.length === 0) return true; // Spell not gated by skill tree

    // Check if entity has unlocked any of these nodes
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic?.skillTreeState?.[paradigmId]) return false;

    const state = magic.skillTreeState[paradigmId];
    return unlockingNodes.some(node => state?.unlockedNodes.includes(node.id));
  }

  /**
   * Get unlocked spells for an entity from all skill trees.
   *
   * @param entity The entity to get unlocked spells for
   * @returns Array of spell IDs unlocked via skill trees
   */
  getUnlockedSpellsFromSkillTrees(entity: EntityImpl): string[] {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic?.skillTreeState) return [];

    const unlockedSpells: string[] = [];

    for (const [paradigmId, state] of Object.entries(magic.skillTreeState)) {
      if (!state) continue;

      const tree = this.skillTreeRegistry.getTree(paradigmId);
      if (!tree) continue;

      for (const nodeId of state.unlockedNodes) {
        const node = tree.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        for (const effect of node.effects) {
          const spellId = effect.target?.spellId;
          if (effect.type === 'unlock_spell' && spellId) {
            unlockedSpells.push(spellId);
          }
        }
      }
    }

    return unlockedSpells;
  }

  /**
   * Get skill tree progression for an entity.
   *
   * @param entity The entity to get progression for
   * @param paradigmId The paradigm to get progression for
   * @returns Progression data or undefined if not found
   */
  getSkillTreeProgress(entity: EntityImpl, paradigmId: string): {
    xp: number;
    unlockedNodes: string[];
    availableNodes: string[];
    totalNodes: number;
  } | undefined {
    if (!this.world) return undefined;

    const tree = this.skillTreeRegistry.getTree(paradigmId);
    if (!tree) return undefined;

    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    const state = magic?.skillTreeState?.[paradigmId] ?? { xp: 0, unlockedNodes: [], nodeProgress: {} };

    // Build evaluation context
    const evalContext = this.buildEvaluationContext(entity, paradigmId, state);
    if (!evalContext) return undefined;

    // Find available nodes
    const availableNodes: string[] = [];
    for (const node of tree.nodes) {
      if (state.unlockedNodes.includes(node.id)) continue;

      const evaluation = evaluateNode(node, tree, evalContext);
      if (evaluation.canPurchase && evaluation.visible && state.xp >= node.xpCost) {
        availableNodes.push(node.id);
      }
    }

    return {
      xp: state.xp,
      unlockedNodes: state.unlockedNodes,
      availableNodes,
      totalNodes: tree.nodes.length,
    };
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Build an EvaluationContext for skill tree evaluation.
   */
  private buildEvaluationContext(
    entity: EntityImpl,
    paradigmId: string,
    state: { xp: number; unlockedNodes: string[]; nodeProgress: Record<string, number> }
  ): EvaluationContext | undefined {
    if (!this.world) return undefined;

    const magic = entity.getComponent<MagicComponent>(CT.Magic);

    // Build MagicSkillProgress from the state
    const progress = {
      paradigmId,
      treeVersion: 1,
      unlockedNodes: state.unlockedNodes.reduce((acc, nodeId) => {
        acc[nodeId] = 1; // Level 1 for unlocked nodes
        return acc;
      }, {} as Record<string, number>),
      totalXpEarned: state.xp,
      availableXp: state.xp,
      discoveries: {},
      relationships: {},
      milestones: {},
    };

    return {
      world: this.world,
      agentId: entity.id,
      progress,
      magicComponent: magic ? {
        paradigmState: magic.paradigmState as Record<string, unknown>,
        techniqueProficiency: magic.techniqueProficiency as Record<string, number>,
        formProficiency: magic.formProficiency as Record<string, number>,
        corruption: magic.corruption,
        favorLevel: magic.favorLevel,
        manaPools: magic.manaPools.map(p => ({
          source: p.source,
          current: p.current,
          maximum: p.maximum,
        })),
        resourcePools: Object.fromEntries(
          Object.entries(magic.resourcePools).map(([key, pool]) => [
            key,
            { current: pool?.current ?? 0, maximum: pool?.maximum ?? 100 },
          ])
        ),
      } : undefined,
    };
  }
}
