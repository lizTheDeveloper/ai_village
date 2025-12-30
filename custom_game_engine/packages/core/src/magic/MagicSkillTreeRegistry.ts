/**
 * MagicSkillTreeRegistry - Central registry for magic skill trees
 *
 * Manages all magic skill trees and provides lookup by paradigm ID.
 * Supports:
 * - Registering trees for each paradigm
 * - Looking up trees by paradigm ID
 * - Validating tree structure
 * - Version management for save compatibility
 */

import type {
  MagicSkillTree,
  MagicSkillNode,
  MagicSkillEffect,
  UnlockCondition,
  MagicXPSource,
} from './MagicSkillTree.js';

// ============================================================================
// Validation Types
// ============================================================================

/** Validation error for a skill tree */
export interface TreeValidationError {
  type: 'error' | 'warning';
  path: string;
  message: string;
}

/** Result of validating a skill tree */
export interface TreeValidationResult {
  valid: boolean;
  errors: TreeValidationError[];
  warnings: TreeValidationError[];
}

// ============================================================================
// Registry Class
// ============================================================================

/**
 * Registry for magic skill trees.
 * Singleton pattern - use MagicSkillTreeRegistry.getInstance().
 */
export class MagicSkillTreeRegistry {
  private static instance: MagicSkillTreeRegistry | null = null;

  /** Trees indexed by paradigm ID */
  private trees: Map<string, MagicSkillTree> = new Map();

  /** Tree versions for compatibility checking */
  private treeVersions: Map<string, number> = new Map();

  /** Callbacks for when trees are registered */
  private onRegisterCallbacks: Array<(tree: MagicSkillTree) => void> = [];

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance.
   */
  static getInstance(): MagicSkillTreeRegistry {
    if (!MagicSkillTreeRegistry.instance) {
      MagicSkillTreeRegistry.instance = new MagicSkillTreeRegistry();
    }
    return MagicSkillTreeRegistry.instance;
  }

  /**
   * Reset the registry (for testing).
   */
  static resetInstance(): void {
    MagicSkillTreeRegistry.instance = null;
  }

  // ========== Registration ==========

  /**
   * Register a skill tree for a paradigm.
   * Validates the tree and throws if invalid.
   */
  register(tree: MagicSkillTree): void {
    const validation = this.validate(tree);

    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`).join('\n');
      throw new Error(`Invalid skill tree '${tree.id}':\n${errorMessages}`);
    }

    // Check for version conflicts
    const existingVersion = this.treeVersions.get(tree.paradigmId);
    if (existingVersion !== undefined && existingVersion >= tree.version) {
      throw new Error(
        `Cannot register tree '${tree.id}' version ${tree.version}: ` +
        `version ${existingVersion} already registered for paradigm '${tree.paradigmId}'`
      );
    }

    this.trees.set(tree.paradigmId, tree);
    this.treeVersions.set(tree.paradigmId, tree.version);

    // Notify callbacks
    for (const callback of this.onRegisterCallbacks) {
      callback(tree);
    }
  }

  /**
   * Register multiple trees at once.
   */
  registerAll(trees: MagicSkillTree[]): void {
    for (const tree of trees) {
      this.register(tree);
    }
  }

  /**
   * Unregister a tree (for testing or hot-reloading).
   */
  unregister(paradigmId: string): boolean {
    const existed = this.trees.has(paradigmId);
    this.trees.delete(paradigmId);
    this.treeVersions.delete(paradigmId);
    return existed;
  }

  /**
   * Add a callback for when trees are registered.
   */
  onRegister(callback: (tree: MagicSkillTree) => void): void {
    this.onRegisterCallbacks.push(callback);
  }

  // ========== Lookup ==========

  /**
   * Get a skill tree by paradigm ID.
   */
  getTree(paradigmId: string): MagicSkillTree | undefined {
    return this.trees.get(paradigmId);
  }

  /**
   * Get a skill tree by paradigm ID, throwing if not found.
   */
  getTreeOrThrow(paradigmId: string): MagicSkillTree {
    const tree = this.trees.get(paradigmId);
    if (!tree) {
      throw new Error(`No skill tree registered for paradigm '${paradigmId}'`);
    }
    return tree;
  }

  /**
   * Check if a tree exists for a paradigm.
   */
  hasTree(paradigmId: string): boolean {
    return this.trees.has(paradigmId);
  }

  /**
   * Get all registered paradigm IDs.
   */
  getParadigmIds(): string[] {
    return Array.from(this.trees.keys());
  }

  /**
   * Get all registered trees.
   */
  getAllTrees(): MagicSkillTree[] {
    return Array.from(this.trees.values());
  }

  /**
   * Get the version of a tree.
   */
  getTreeVersion(paradigmId: string): number | undefined {
    return this.treeVersions.get(paradigmId);
  }

  // ========== Node Lookup ==========

  /**
   * Get a node from a tree by ID.
   */
  getNode(paradigmId: string, nodeId: string): MagicSkillNode | undefined {
    const tree = this.trees.get(paradigmId);
    if (!tree) return undefined;
    return tree.nodes.find(n => n.id === nodeId);
  }

  /**
   * Get a node, throwing if not found.
   */
  getNodeOrThrow(paradigmId: string, nodeId: string): MagicSkillNode {
    const node = this.getNode(paradigmId, nodeId);
    if (!node) {
      throw new Error(`Node '${nodeId}' not found in paradigm '${paradigmId}'`);
    }
    return node;
  }

  /**
   * Find all nodes across all trees that match a predicate.
   */
  findNodes(predicate: (node: MagicSkillNode, tree: MagicSkillTree) => boolean): Array<{
    tree: MagicSkillTree;
    node: MagicSkillNode;
  }> {
    const results: Array<{ tree: MagicSkillTree; node: MagicSkillNode }> = [];

    for (const tree of this.trees.values()) {
      for (const node of tree.nodes) {
        if (predicate(node, tree)) {
          results.push({ tree, node });
        }
      }
    }

    return results;
  }

  /**
   * Find nodes by tag.
   */
  findNodesByTag(tag: string): Array<{ tree: MagicSkillTree; node: MagicSkillNode }> {
    return this.findNodes(node => node.tags?.includes(tag) ?? false);
  }

  /**
   * Find nodes by category.
   */
  findNodesByCategory(category: MagicSkillNode['category']): Array<{
    tree: MagicSkillTree;
    node: MagicSkillNode;
  }> {
    return this.findNodes(node => node.category === category);
  }

  // ========== Validation ==========

  /**
   * Validate a skill tree structure.
   */
  validate(tree: MagicSkillTree): TreeValidationResult {
    const errors: TreeValidationError[] = [];
    const warnings: TreeValidationError[] = [];

    // Basic required fields
    if (!tree.id) {
      errors.push({ type: 'error', path: 'id', message: 'Tree ID is required' });
    }
    if (!tree.paradigmId) {
      errors.push({ type: 'error', path: 'paradigmId', message: 'Paradigm ID is required' });
    }
    if (!tree.name) {
      errors.push({ type: 'error', path: 'name', message: 'Tree name is required' });
    }
    if (!tree.nodes || tree.nodes.length === 0) {
      errors.push({ type: 'error', path: 'nodes', message: 'Tree must have at least one node' });
    }
    if (tree.version === undefined || tree.version < 1) {
      errors.push({ type: 'error', path: 'version', message: 'Tree version must be >= 1' });
    }

    // Check node structure
    const nodeIds = new Set<string>();
    for (let i = 0; i < (tree.nodes?.length ?? 0); i++) {
      const node = tree.nodes[i];
      if (!node) continue; // Guard against undefined array element
      const path = `nodes[${i}]`;

      if (!node.id) {
        errors.push({ type: 'error', path: `${path}.id`, message: 'Node ID is required' });
      } else if (nodeIds.has(node.id)) {
        errors.push({ type: 'error', path: `${path}.id`, message: `Duplicate node ID: ${node.id}` });
      } else {
        nodeIds.add(node.id);
      }

      if (!node.name) {
        errors.push({ type: 'error', path: `${path}.name`, message: 'Node name is required' });
      }
      if (!node.paradigmId) {
        errors.push({ type: 'error', path: `${path}.paradigmId`, message: 'Node paradigm ID is required' });
      } else if (node.paradigmId !== tree.paradigmId) {
        warnings.push({
          type: 'warning',
          path: `${path}.paradigmId`,
          message: `Node paradigm '${node.paradigmId}' differs from tree paradigm '${tree.paradigmId}'`,
        });
      }

      if (node.xpCost < 0) {
        errors.push({ type: 'error', path: `${path}.xpCost`, message: 'XP cost cannot be negative' });
      }
      if (node.maxLevel < 1) {
        errors.push({ type: 'error', path: `${path}.maxLevel`, message: 'Max level must be >= 1' });
      }

      // Validate effects
      this.validateEffects(node.effects, `${path}.effects`, errors, warnings);

      // Validate conditions
      this.validateConditions(node.unlockConditions, `${path}.unlockConditions`, errors, warnings);
    }

    // Check prerequisites reference valid nodes
    for (const node of tree.nodes ?? []) {
      if (node.prerequisites) {
        for (const prereqId of node.prerequisites) {
          if (!nodeIds.has(prereqId)) {
            errors.push({
              type: 'error',
              path: `nodes.${node.id}.prerequisites`,
              message: `Prerequisite '${prereqId}' not found in tree`,
            });
          }
        }
      }
    }

    // Check entry nodes exist
    for (const entryId of tree.entryNodes ?? []) {
      if (!nodeIds.has(entryId)) {
        errors.push({
          type: 'error',
          path: 'entryNodes',
          message: `Entry node '${entryId}' not found in tree`,
        });
      }
    }

    // Check connections reference valid nodes
    for (let i = 0; i < (tree.connections?.length ?? 0); i++) {
      const conn = tree.connections[i];
      if (!conn) continue; // Guard against undefined array element
      if (!nodeIds.has(conn.from)) {
        errors.push({
          type: 'error',
          path: `connections[${i}].from`,
          message: `Connection source '${conn.from}' not found`,
        });
      }
      if (!nodeIds.has(conn.to)) {
        errors.push({
          type: 'error',
          path: `connections[${i}].to`,
          message: `Connection target '${conn.to}' not found`,
        });
      }
    }

    // Check XP sources
    this.validateXPSources(tree.xpSources, 'xpSources', errors, warnings);

    // Check for cycles in prerequisites
    const cycleResult = this.detectCycles(tree);
    if (cycleResult) {
      errors.push({
        type: 'error',
        path: 'nodes',
        message: `Cycle detected in prerequisites: ${cycleResult.join(' -> ')}`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateEffects(
    effects: MagicSkillEffect[] | undefined,
    path: string,
    errors: TreeValidationError[],
    _warnings: TreeValidationError[] // Reserved for future effect warnings
  ): void {
    if (!effects) return;

    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];
      if (!effect) continue;
      const effectPath = `${path}[${i}]`;

      if (!effect.type) {
        errors.push({ type: 'error', path: `${effectPath}.type`, message: 'Effect type is required' });
      }
      if (effect.baseValue === undefined) {
        errors.push({ type: 'error', path: `${effectPath}.baseValue`, message: 'Effect baseValue is required' });
      }
    }
  }

  private validateConditions(
    conditions: UnlockCondition[] | undefined,
    path: string,
    errors: TreeValidationError[],
    warnings: TreeValidationError[]
  ): void {
    if (!conditions) return;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      if (!condition) continue;
      const condPath = `${path}[${i}]`;

      if (!condition.type) {
        errors.push({ type: 'error', path: `${condPath}.type`, message: 'Condition type is required' });
      }
      if (!condition.description) {
        warnings.push({ type: 'warning', path: `${condPath}.description`, message: 'Condition description is recommended' });
      }
      if (condition.bypassable && condition.bypassCost === undefined) {
        warnings.push({ type: 'warning', path: `${condPath}.bypassCost`, message: 'Bypassable condition should have bypassCost' });
      }
    }
  }

  private validateXPSources(
    sources: MagicXPSource[] | undefined,
    path: string,
    errors: TreeValidationError[],
    _warnings: TreeValidationError[] // Reserved for future XP source warnings
  ): void {
    if (!sources) return;

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      if (!source) continue;
      const sourcePath = `${path}[${i}]`;

      if (!source.eventType) {
        errors.push({ type: 'error', path: `${sourcePath}.eventType`, message: 'XP source event type is required' });
      }
      if (source.xpAmount < 0) {
        errors.push({ type: 'error', path: `${sourcePath}.xpAmount`, message: 'XP amount cannot be negative' });
      }
    }
  }

  /**
   * Detect cycles in prerequisites using DFS.
   * Returns the cycle path if found, undefined otherwise.
   */
  private detectCycles(tree: MagicSkillTree): string[] | undefined {
    const nodeMap = new Map<string, MagicSkillNode>();
    for (const node of tree.nodes) {
      nodeMap.set(node.id, node);
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): string[] | undefined => {
      if (recursionStack.has(nodeId)) {
        // Found cycle - return path from start of cycle
        const cycleStart = path.indexOf(nodeId);
        return [...path.slice(cycleStart), nodeId];
      }

      if (visited.has(nodeId)) {
        return undefined;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = nodeMap.get(nodeId);
      if (node?.prerequisites) {
        for (const prereqId of node.prerequisites) {
          const cycle = dfs(prereqId);
          if (cycle) return cycle;
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
      return undefined;
    };

    for (const nodeId of nodeMap.keys()) {
      if (!visited.has(nodeId)) {
        const cycle = dfs(nodeId);
        if (cycle) return cycle;
      }
    }

    return undefined;
  }

  // ========== Statistics ==========

  /**
   * Get statistics about a tree.
   */
  getTreeStats(paradigmId: string): {
    totalNodes: number;
    nodesByCategory: Record<string, number>;
    nodesByTier: Record<number, number>;
    totalXpRequired: number;
    avgNodeCost: number;
    entryNodeCount: number;
    maxTier: number;
  } | undefined {
    const tree = this.trees.get(paradigmId);
    if (!tree) return undefined;

    const nodesByCategory: Record<string, number> = {};
    const nodesByTier: Record<number, number> = {};
    let maxTier = 0;

    for (const node of tree.nodes) {
      nodesByCategory[node.category] = (nodesByCategory[node.category] ?? 0) + 1;
      nodesByTier[node.tier] = (nodesByTier[node.tier] ?? 0) + 1;
      if (node.tier > maxTier) maxTier = node.tier;
    }

    return {
      totalNodes: tree.nodes.length,
      nodesByCategory,
      nodesByTier,
      totalXpRequired: tree.totalXpRequired ?? 0,
      avgNodeCost: tree.nodes.length > 0
        ? (tree.totalXpRequired ?? 0) / tree.nodes.length
        : 0,
      entryNodeCount: tree.entryNodes.length,
      maxTier,
    };
  }

  /**
   * Get a summary of all registered trees.
   */
  getSummary(): Array<{
    paradigmId: string;
    name: string;
    version: number;
    totalNodes: number;
    totalXpRequired: number;
  }> {
    return Array.from(this.trees.values()).map(tree => ({
      paradigmId: tree.paradigmId,
      name: tree.name,
      version: tree.version,
      totalNodes: tree.nodes.length,
      totalXpRequired: tree.totalXpRequired ?? 0,
    }));
  }

  // ========== Export/Import ==========

  /**
   * Export all trees as a serializable object.
   */
  exportAll(): Record<string, MagicSkillTree> {
    const result: Record<string, MagicSkillTree> = {};
    for (const [paradigmId, tree] of this.trees) {
      result[paradigmId] = tree;
    }
    return result;
  }

  /**
   * Import trees from a serialized object.
   */
  importAll(data: Record<string, MagicSkillTree>): void {
    for (const tree of Object.values(data)) {
      this.register(tree);
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the global registry instance.
 */
export function getSkillTreeRegistry(): MagicSkillTreeRegistry {
  return MagicSkillTreeRegistry.getInstance();
}

/**
 * Register a skill tree in the global registry.
 */
export function registerSkillTree(tree: MagicSkillTree): void {
  MagicSkillTreeRegistry.getInstance().register(tree);
}

/**
 * Get a skill tree from the global registry.
 */
export function getSkillTree(paradigmId: string): MagicSkillTree | undefined {
  return MagicSkillTreeRegistry.getInstance().getTree(paradigmId);
}

/**
 * Check if a skill tree exists in the global registry.
 */
export function hasSkillTree(paradigmId: string): boolean {
  return MagicSkillTreeRegistry.getInstance().hasTree(paradigmId);
}
