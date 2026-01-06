/**
 * ParadigmTreeView - Renders a complete skill tree for a single paradigm
 *
 * Responsibilities:
 * - Coordinate layout, node rendering, and dependency lines
 * - Handle viewport (pan/zoom)
 * - Manage hover/selection state
 * - Render XP display
 * - Render tooltips
 */

import type { MagicSkillTree, MagicSkillNode, MagicSkillProgress, EvaluationContext } from '@ai-village/magic';
import { evaluateTree } from '@ai-village/magic';
import { TreeLayoutEngine } from './TreeLayoutEngine.js';
import { SkillNodeRenderer } from './SkillNodeRenderer.js';
import { NodeTooltip } from './NodeTooltip.js';
import type { TreeLayout, Viewport } from './types.js';

export interface ParadigmTreeViewOptions {
  /** Current viewport state */
  viewport: Viewport;
  /** Currently hovered node ID */
  hoveredNodeId?: string;
  /** Currently selected node ID */
  selectedNodeId?: string;
  /** Show debug info? */
  showDebug?: boolean;
}

export class ParadigmTreeView {
  private layoutEngine: TreeLayoutEngine;
  private nodeRenderer: SkillNodeRenderer;
  private tooltip: NodeTooltip;
  private cachedLayout?: TreeLayout;
  private cachedTreeId?: string;

  constructor() {
    this.layoutEngine = new TreeLayoutEngine();
    this.nodeRenderer = new SkillNodeRenderer();
    this.tooltip = new NodeTooltip();
  }

  /**
   * Render the complete tree view.
   *
   * @param ctx Canvas rendering context
   * @param tree Skill tree to render
   * @param progress Agent's progress in this tree
   * @param evaluationContext Context for evaluating conditions
   * @param x X position of content area
   * @param y Y position of content area
   * @param width Width of content area
   * @param height Height of content area
   * @param options Rendering options
   * @param timestamp Animation timestamp
   */
  render(
    ctx: CanvasRenderingContext2D,
    tree: MagicSkillTree,
    progress: MagicSkillProgress,
    evaluationContext: EvaluationContext,
    x: number,
    y: number,
    width: number,
    height: number,
    options: ParadigmTreeViewOptions,
    timestamp: number = 0
  ): void {
    if (!ctx || !tree || !progress || !evaluationContext) {
      throw new Error('ParadigmTreeView.render requires ctx, tree, progress, and evaluationContext');
    }

    // Get or calculate layout
    const layout = this.getLayout(tree);

    // Evaluate all nodes
    const evaluations = evaluateTree(tree, evaluationContext);

    // Clear background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    // Setup viewport transform
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2); // Center viewport
    ctx.translate(options.viewport.offsetX * options.viewport.zoom, options.viewport.offsetY * options.viewport.zoom);
    ctx.scale(options.viewport.zoom, options.viewport.zoom);

    // Render dependency lines
    this.renderDependencyLines(ctx, tree, layout);

    // Render nodes
    let hoveredNode: MagicSkillNode | null = null;
    for (const node of tree.nodes) {
      const evaluation = evaluations.get(node.id);
      if (!evaluation) continue;

      const pos = layout.nodes.get(node.id);
      if (!pos) continue;

      const isHovered = options.hoveredNodeId === node.id;
      const isSelected = options.selectedNodeId === node.id;

      if (isHovered) {
        hoveredNode = node;
      }

      this.nodeRenderer.render(
        ctx,
        node,
        evaluation,
        pos.x,
        pos.y,
        pos.width,
        pos.height,
        timestamp,
        isHovered || isSelected
      );
    }

    // Restore transform
    ctx.restore();

    // Render XP display (top-right, in screen space)
    this.renderXPDisplay(ctx, progress, x + width - 200, y + 10);

    // Render tooltip for hovered node (in screen space)
    if (hoveredNode && options.hoveredNodeId) {
      const evaluation = evaluations.get(hoveredNode.id);
      if (evaluation) {
        // Convert tree coords to screen coords for tooltip anchor
        const pos = layout.nodes.get(hoveredNode.id);
        if (pos) {
          const screenX = x + width / 2 + (pos.x + pos.width / 2 + options.viewport.offsetX) * options.viewport.zoom;
          const screenY = y + height / 2 + (pos.y + options.viewport.offsetY) * options.viewport.zoom;

          this.tooltip.render(ctx, hoveredNode, evaluation, screenX, screenY);
        }
      }
    }

    // Debug info
    if (options.showDebug) {
      this.renderDebugInfo(ctx, tree, layout, options.viewport, x + 10, y + height - 60);
    }
  }

  /**
   * Get or calculate layout for a tree.
   */
  private getLayout(tree: MagicSkillTree): TreeLayout {
    // Use cached layout if tree hasn't changed
    if (this.cachedTreeId === tree.id && this.cachedLayout) {
      return this.cachedLayout;
    }

    // Calculate new layout
    this.cachedLayout = this.layoutEngine.calculateLayout(tree);
    this.cachedTreeId = tree.id;

    return this.cachedLayout;
  }

  /**
   * Render dependency lines between nodes.
   */
  private renderDependencyLines(
    ctx: CanvasRenderingContext2D,
    tree: MagicSkillTree,
    layout: TreeLayout
  ): void {
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;

    for (const connection of tree.connections) {
      const fromPos = layout.nodes.get(connection.from);
      const toPos = layout.nodes.get(connection.to);

      if (!fromPos || !toPos) continue;

      const fromX = fromPos.x + fromPos.width / 2;
      const fromY = fromPos.y + fromPos.height;
      const toX = toPos.x + toPos.width / 2;
      const toY = toPos.y;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Draw arrow at end
      this.drawArrow(ctx, fromX, fromY, toX, toY);
    }
  }

  /**
   * Draw an arrow pointing from (x1,y1) to (x2,y2).
   */
  private drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    const headLength = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle - Math.PI / 6),
      y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle + Math.PI / 6),
      y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  /**
   * Render XP display.
   */
  private renderXPDisplay(ctx: CanvasRenderingContext2D, progress: MagicSkillProgress, x: number, y: number): void {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, 180, 40);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 180, 40);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`XP: ${progress.availableXp}`, x + 10, y + 5);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`Total earned: ${progress.totalXpEarned}`, x + 10, y + 22);
  }

  /**
   * Render debug information.
   */
  private renderDebugInfo(
    ctx: CanvasRenderingContext2D,
    tree: MagicSkillTree,
    layout: TreeLayout,
    viewport: Viewport,
    x: number,
    y: number
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, 300, 50);

    ctx.fillStyle = '#00ff00';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillText(`Nodes: ${tree.nodes.length}`, x + 5, y + 5);
    ctx.fillText(`Bounds: ${layout.bounds.width.toFixed(0)} x ${layout.bounds.height.toFixed(0)}`, x + 5, y + 18);
    ctx.fillText(`Viewport: offset(${viewport.offsetX.toFixed(0)}, ${viewport.offsetY.toFixed(0)}) zoom(${viewport.zoom.toFixed(2)})`, x + 5, y + 31);
  }

  /**
   * Find node at screen coordinates.
   */
  findNodeAtPosition(
    tree: MagicSkillTree,
    screenX: number,
    screenY: number,
    viewport: Viewport,
    contentX: number,
    contentY: number,
    contentWidth: number,
    contentHeight: number
  ): string | undefined {
    const layout = this.getLayout(tree);

    // Convert screen coords to tree coords
    const viewportCenterX = contentX + contentWidth / 2;
    const viewportCenterY = contentY + contentHeight / 2;

    const offsetScreenX = screenX - viewportCenterX;
    const offsetScreenY = screenY - viewportCenterY;

    const treeX = (offsetScreenX / viewport.zoom) - viewport.offsetX;
    const treeY = (offsetScreenY / viewport.zoom) - viewport.offsetY;

    return this.layoutEngine.findNodeAtPosition(layout, treeX, treeY, { offsetX: 0, offsetY: 0, zoom: 1 });
  }

  /**
   * Clear cached layout (call when tree changes).
   */
  clearCache(): void {
    this.cachedLayout = undefined;
    this.cachedTreeId = undefined;
  }

  /**
   * Calculate layout for a tree (public API).
   */
  calculateLayout(tree: MagicSkillTree): Map<string, { x: number; y: number }> {
    const layout = this.layoutEngine.calculateLayout(tree);
    const positionMap = new Map<string, { x: number; y: number }>();

    for (const [nodeId, pos] of layout.nodes.entries()) {
      positionMap.set(nodeId, { x: pos.x, y: pos.y });
    }

    return positionMap;
  }

  /**
   * Set tree (for explicit tree updates).
   */
  setTree(_tree: MagicSkillTree): void {
    // Just clear cache - tree is passed to render()
    this.clearCache();
  }

  /**
   * Set evaluation results (for pre-computed evaluations).
   */
  setEvaluationResults(_results: Map<string, any>): void {
    // Not needed - evaluations are computed in render()
    // This is a no-op for API compatibility
  }

  /**
   * Set viewport scroll.
   */
  setScroll(_x: number, _y: number): void {
    // Viewport is passed via options in render()
    // This is a no-op for API compatibility
  }

  /**
   * Set viewport zoom.
   */
  setZoom(_factor: number): void {
    // Viewport is passed via options in render()
    // This is a no-op for API compatibility
  }

  /**
   * Get current zoom level.
   */
  getZoom(): number {
    // Viewport is managed by SkillTreePanel
    return 1.0;
  }

  /**
   * Handle mouse wheel zoom.
   */
  handleMouseWheel(_delta: number): void {
    // Viewport is managed by SkillTreePanel
    // This is a no-op for API compatibility
  }

  /**
   * Set hovered node.
   */
  setHoveredNode(_nodeId: string | null): void {
    // Hover state is passed via options in render()
    // This is a no-op for API compatibility
  }

  /**
   * Get hovered node.
   */
  getHoveredNode(): string | null {
    // Hover state is managed by SkillTreePanel
    return null;
  }

  /**
   * Handle click at position (returns clicked node ID).
   */
  handleClick(
    x: number,
    y: number,
    tree?: MagicSkillTree,
    viewport?: Viewport
  ): string | null {
    if (!tree || !viewport) {
      return null;
    }

    return this.findNodeAtPosition(
      tree,
      x,
      y,
      viewport,
      0,
      0,
      800, // Default content width
      600  // Default content height
    ) || null;
  }

  /**
   * Handle mouse move (for hover).
   */
  handleMouseMove(
    _x: number,
    _y: number,
    _tree?: MagicSkillTree,
    _viewport?: Viewport
  ): void {
    // Hover state is managed by SkillTreePanel
    // This is a no-op for API compatibility
  }
}
