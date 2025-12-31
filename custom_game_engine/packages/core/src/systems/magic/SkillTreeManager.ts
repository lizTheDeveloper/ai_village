/**
 * SkillTreeManager - Manages skill tree progression and spell unlocks
 *
 * Part of Phase 30: Magic System
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { MagicComponent } from '../../components/MagicComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { MagicSkillTreeRegistry } from '../../magic/MagicSkillTreeRegistry.js';
import { evaluateNode, type EvaluationContext } from '../../magic/MagicSkillTreeEvaluator.js';
import { SpellRegistry } from '../../magic/SpellRegistry.js';
import type { SpellLearningManager } from './SpellLearningManager.js';

/**
 * Manages skill tree progression for magic paradigms.
 */
export class SkillTreeManager {
  private world: World | null = null;
  private skillTreeRegistry: MagicSkillTreeRegistry | null = null;
  private spellLearning: SpellLearningManager | null = null;

  /**
   * Initialize with world and spell learning manager.
   */
  initialize(world: World, spellLearning: SpellLearningManager): void {
    this.world = world;
    this.skillTreeRegistry = MagicSkillTreeRegistry.getInstance();
    this.spellLearning = spellLearning;
  }

  /**
   * Grant skill XP to an entity for a specific paradigm.
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

  /**
   * Check if any skill tree nodes can be unlocked with current XP.
   */
  private checkSkillTreeUnlocks(entity: EntityImpl, paradigmId: string): void {
    if (!this.skillTreeRegistry || !this.world) return;

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

    // Emit unlock event (triggers handleSkillNodeUnlocked)
    // Using generic emit for events not in GameEventMap
    (this.world?.eventBus as unknown as { emit: (e: Record<string, unknown>) => void })?.emit({
      type: 'magic:skill_node_unlocked',
      source: entity.id,
      data: {
        entityId: entity.id,
        paradigmId,
        nodeId,
        xpSpent: xpCost,
      },
    });

    return true;
  }

  /**
   * Handle when a skill node is unlocked.
   * Checks if the node grants spells and auto-learns them.
   */
  handleSkillNodeUnlocked(entity: EntityImpl, paradigmId: string, nodeId: string): void {
    if (!this.skillTreeRegistry) return;

    const node = this.skillTreeRegistry.getNode(paradigmId, nodeId);
    if (!node) return;

    // Check node effects for spell unlocks
    for (const effect of node.effects) {
      const spellId = effect.target?.spellId;
      if (effect.type === 'unlock_spell' && spellId && this.spellLearning) {
        // Auto-learn the unlocked spell
        this.spellLearning.learnSpell(entity, spellId, effect.baseValue ?? 0);

        // Emit event (using type assertion for custom event)
        (this.world?.eventBus as any)?.emit({
          type: 'magic:spell_unlocked_from_skill_tree',
          source: entity.id,
          data: {
            spellId,
            paradigmId,
            nodeId,
            initialProficiency: effect.baseValue ?? 0,
          },
        });
      }
    }
  }

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

  /**
   * Check if an entity meets skill tree requirements for a spell.
   */
  checkSkillTreeRequirements(entity: EntityImpl, spellId: string): boolean {
    if (!this.skillTreeRegistry) return true; // No registry = no requirements

    const spellRegistry = SpellRegistry.getInstance();
    const spell = spellRegistry.getSpell(spellId);
    if (!spell) return false;

    // Check if spell has skill tree requirements
    const paradigmId = spell.paradigmId ?? 'academic';
    const tree = this.skillTreeRegistry.getTree(paradigmId);
    if (!tree) return true; // No tree = no requirements

    // Find nodes that unlock this spell
    const unlockingNodes = tree.nodes.filter(node =>
      node.effects.some(e => e.type === 'unlock_spell' && e.target?.spellId === spellId)
    );

    if (unlockingNodes.length === 0) return true; // Spell not gated by skill tree

    // Check if entity has unlocked any of these nodes
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic?.skillTreeState?.[paradigmId]) return false;

    const state = magic.skillTreeState[paradigmId];
    return unlockingNodes.some(node => state?.unlockedNodes.includes(node.id));
  }

  /**
   * Get unlocked spells for an entity from skill trees.
   */
  getUnlockedSpellsFromSkillTrees(entity: EntityImpl): string[] {
    if (!this.skillTreeRegistry) return [];

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
   */
  getSkillTreeProgress(entity: EntityImpl, paradigmId: string): {
    xp: number;
    unlockedNodes: string[];
    availableNodes: string[];
    totalNodes: number;
  } | undefined {
    if (!this.skillTreeRegistry || !this.world) return undefined;

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
}
