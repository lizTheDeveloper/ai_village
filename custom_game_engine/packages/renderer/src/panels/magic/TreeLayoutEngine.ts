/**
 * TreeLayoutEngine - Positions skill nodes in a tree layout
 *
 * Strategy: Layered layout based on category
 * - Foundation nodes at top
 * - Technique/Discovery/Relationship nodes in middle
 * - Mastery nodes lower
 * - Forbidden nodes at bottom
 *
 * Within each layer, nodes are spread horizontally to avoid overlap.
 */

import type { MagicSkillTree, MagicSkillNode } from '@ai-village/magic';
import type { TreeLayout, NodePosition, LayoutConfig } from './types.js';
import { DEFAULT_LAYOUT_CONFIG } from './types.js';

export class TreeLayoutEngine {
  private config: LayoutConfig;

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  }

  /**
   * Calculate layout for an entire skill tree.
   */
  calculateLayout(tree: MagicSkillTree): TreeLayout {
    if (!tree || !tree.nodes || tree.nodes.length === 0) {
      throw new Error('Tree layout requires a tree with at least one node');
    }

    const nodes = new Map<string, NodePosition>();

    // Group nodes by category
    const nodesByCategory = this.groupNodesByCategory(tree.nodes);

    // Position nodes category by category
    for (const [category, categoryNodes] of Object.entries(nodesByCategory)) {
      const yOffset = this.config.categoryYOffsets[category] ?? 0;
      this.positionNodesInCategory(categoryNodes, yOffset, nodes);
    }

    // Calculate bounds
    const bounds = this.calculateBounds(nodes);

    return { nodes, bounds };
  }

  /**
   * Group nodes by their category.
   */
  private groupNodesByCategory(nodes: MagicSkillNode[]): Record<string, MagicSkillNode[]> {
    const grouped: Record<string, MagicSkillNode[]> = {};

    for (const node of nodes) {
      const category = node.category || 'foundation';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(node);
    }

    return grouped;
  }

  /**
   * Position nodes within a category horizontally.
   */
  private positionNodesInCategory(
    nodes: MagicSkillNode[],
    yOffset: number,
    positions: Map<string, NodePosition>
  ): void {
    if (nodes.length === 0) return;

    // Sort by tier first, then by ID for stability
    const sorted = [...nodes].sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.id.localeCompare(b.id);
    });

    // Position nodes horizontally, spreading them out
    const totalWidth = (sorted.length - 1) * this.config.nodeSpacingX;
    const startX = -(totalWidth / 2); // Center around origin

    sorted.forEach((node, index) => {
      const x = startX + (index * this.config.nodeSpacingX);
      const y = yOffset;

      positions.set(node.id, {
        nodeId: node.id,
        x,
        y,
        width: this.config.nodeWidth,
        height: this.config.nodeHeight,
      });
    });
  }

  /**
   * Calculate bounding box for all positioned nodes.
   */
  private calculateBounds(positions: Map<string, NodePosition>): TreeLayout['bounds'] {
    if (positions.size === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pos of positions.values()) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + pos.width);
      maxY = Math.max(maxY, pos.y + pos.height);
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Get position for a specific node.
   */
  getNodePosition(layout: TreeLayout, nodeId: string): NodePosition | undefined {
    return layout.nodes.get(nodeId);
  }

  /**
   * Find node at screen coordinates.
   */
  findNodeAtPosition(
    layout: TreeLayout,
    screenX: number,
    screenY: number,
    viewport: { offsetX: number; offsetY: number; zoom: number }
  ): string | undefined {
    // Convert screen coords to tree coords
    const treeX = (screenX / viewport.zoom) - viewport.offsetX;
    const treeY = (screenY / viewport.zoom) - viewport.offsetY;

    // Check each node
    for (const [nodeId, pos] of layout.nodes) {
      if (
        treeX >= pos.x &&
        treeX <= pos.x + pos.width &&
        treeY >= pos.y &&
        treeY <= pos.y + pos.height
      ) {
        return nodeId;
      }
    }

    return undefined;
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<LayoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): LayoutConfig {
    return { ...this.config };
  }
}
