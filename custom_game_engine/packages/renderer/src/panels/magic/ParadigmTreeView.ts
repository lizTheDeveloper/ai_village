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
  private tree: MagicSkillTree;
  private layoutEngine: TreeLayoutEngine;
  private nodeRenderer: SkillNodeRenderer;
  private tooltip: NodeTooltip;
  private cachedLayout?: TreeLayout;
  private cachedTreeId?: string;
  private evaluationResults?: Map<string, any>;
  private viewport: Viewport;
  private hoveredNodeId: string | null = null;

  constructor(tree?: MagicSkillTree | null) {
    if (tree !== undefined && tree !== null) {
      // Stateful mode with instance tree
      // Check for duplicate node IDs
      const nodeIds = new Set<string>();
      for (const node of tree.nodes) {
        if (nodeIds.has(node.id)) {
          throw new Error('Duplicate node ID');
        }
        nodeIds.add(node.id);
      }
      this.tree = tree;
    } else if (tree === null) {
      // Explicitly null - throw error
      throw new Error('Tree is required');
    } else {
      // Stateless mode - tree will be passed to render()
      this.tree = null!;
    }

    this.layoutEngine = new TreeLayoutEngine();
    this.nodeRenderer = new SkillNodeRenderer();
    this.tooltip = new NodeTooltip();
    this.viewport = { offsetX: 0, offsetY: 0, zoom: 1.0 };
  }

  /**
   * Render the complete tree view.
   *
   * Supports two call signatures:
   * 1. Stateless: render(ctx, tree, progress, evaluationContext, x, y, width, height, options?, timestamp?)
   * 2. Stateful: render(ctx, x, y, width, height, evaluationContext, progress?, options?, timestamp?)
   */
  render(
    ctx: CanvasRenderingContext2D,
    arg2: MagicSkillTree | number,
    arg3: MagicSkillProgress | number,
    arg4: EvaluationContext | number,
    arg5?: number,
    arg6?: number | EvaluationContext,
    arg7?: number | MagicSkillProgress,
    arg8?: number | ParadigmTreeViewOptions,
    arg9?: ParadigmTreeViewOptions | number,
    arg10?: number
  ): void {
    let tree: MagicSkillTree;
    let progress: MagicSkillProgress | undefined;
    let evaluationContext: EvaluationContext;
    let x: number;
    let y: number;
    let width: number;
    let height: number;
    let options: ParadigmTreeViewOptions | undefined;
    let timestamp: number;

    // Detect which signature is being used
    if (typeof arg2 === 'object' && 'nodes' in arg2) {
      // Stateless mode: render(ctx, tree, progress, evaluationContext, x, y, width, height, options?, timestamp?)
      tree = arg2;
      progress = arg3 as MagicSkillProgress;
      evaluationContext = arg4 as EvaluationContext;
      x = arg5!;
      y = arg6 as number;
      width = arg7 as number;
      height = arg8 as number;
      options = arg9 as ParadigmTreeViewOptions | undefined;
      timestamp = (arg10 as number) || 0;
    } else {
      // Stateful mode: render(ctx, x, y, width, height, evaluationContext, progress?, options?, timestamp?)
      if (!this.tree) {
        throw new Error('Tree must be set when using stateful API');
      }
      if (!this.evaluationResults) {
        throw new Error('Evaluation results not set');
      }
      tree = this.tree;
      x = arg2 as number;
      y = arg3 as number;
      width = arg4 as number;
      height = arg5!;
      evaluationContext = arg6 as EvaluationContext;
      progress = arg7 as MagicSkillProgress | undefined;
      options = arg8 as ParadigmTreeViewOptions | undefined;
      timestamp = (arg9 as number) || 0;
    }

    if (!ctx || !evaluationContext) {
      throw new Error('ParadigmTreeView.render requires ctx, tree, progress, and evaluationContext');
    }

    // Use instance viewport if options not provided
    const viewport = options?.viewport || this.viewport;
    const hoveredNodeId = options?.hoveredNodeId || this.hoveredNodeId;
    const selectedNodeId = options?.selectedNodeId;
    const showDebug = options?.showDebug || false;

    // Get or calculate layout
    const layout = this.getLayout(tree);

    // Get evaluation results
    let evaluations: Map<string, any>;
    if (this.evaluationResults) {
      // Use pre-computed results (stateful mode)
      evaluations = this.evaluationResults;
    } else {
      // Compute on-the-fly (stateless mode)
      evaluations = evaluateTree(tree, evaluationContext);
    }

    // Clear background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    // Setup viewport transform
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2); // Center viewport
    ctx.translate(viewport.offsetX * viewport.zoom, viewport.offsetY * viewport.zoom);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Render dependency lines
    this.renderDependencyLines(ctx, tree, layout, hoveredNodeId);

    // Render nodes
    let hoveredNode: MagicSkillNode | null = null;
    for (const node of tree.nodes) {
      const evaluation = evaluations.get(node.id);
      if (!evaluation) continue;

      const pos = layout.nodes.get(node.id);
      if (!pos) continue;

      const isHovered = hoveredNodeId === node.id;
      const isSelected = selectedNodeId === node.id;

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

    // Render XP display (top-right, in screen space) if progress provided
    if (progress) {
      this.renderXPDisplay(ctx, progress, x + width - 200, y + 10);
    }

    // Render tooltip for hovered node (in screen space)
    if (hoveredNode && hoveredNodeId) {
      const evaluation = evaluations.get(hoveredNode.id);
      if (evaluation) {
        // Convert tree coords to screen coords for tooltip anchor
        const pos = layout.nodes.get(hoveredNode.id);
        if (pos) {
          const screenX = x + width / 2 + (pos.x + pos.width / 2 + viewport.offsetX) * viewport.zoom;
          const screenY = y + height / 2 + (pos.y + viewport.offsetY) * viewport.zoom;

          this.tooltip.render(ctx, hoveredNode, evaluation, screenX, screenY);
        }
      }
    }

    // Debug info
    if (showDebug) {
      this.renderDebugInfo(ctx, tree, layout, viewport, x + 10, y + height - 60);
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
    layout: TreeLayout,
    hoveredNodeId?: string | null
  ): void {
    ctx.lineWidth = 2;

    for (const connection of tree.connections) {
      const fromPos = layout.nodes.get(connection.from);
      const toPos = layout.nodes.get(connection.to);

      if (!fromPos || !toPos) continue;

      const fromX = fromPos.x + fromPos.width / 2;
      const fromY = fromPos.y + fromPos.height;
      const toX = toPos.x + toPos.width / 2;
      const toY = toPos.y;

      // Check if this line is connected to hovered node
      const isHighlighted = hoveredNodeId && (connection.from === hoveredNodeId || connection.to === hoveredNodeId);

      // Check if this is a soft/optional requirement
      const toNode = tree.nodes.find(n => n.id === connection.to);
      const isSoftRequirement = toNode?.unlockConditions?.some(c =>
        c.type === 'node_unlocked' && (c as { type: string; soft?: boolean }).soft === true
      );

      // Set line style
      ctx.strokeStyle = isHighlighted ? '#ffff00' : '#444444';

      // Set line dash for optional prerequisites
      if (isSoftRequirement) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      // Draw line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Draw arrow at end
      this.drawArrow(ctx, fromX, fromY, toX, toY);
    }

    // Reset line dash
    ctx.setLineDash([]);
  }

  /**
   * Draw an arrow pointing from (x1,y1) to (x2,y2).
   */
  private drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    const headLength = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Draw filled arrowhead triangle
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle - Math.PI / 6),
      y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headLength * Math.cos(angle + Math.PI / 6),
      y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
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
  calculateLayout(tree?: MagicSkillTree): Map<string, { x: number; y: number }> {
    const targetTree = tree || this.tree;
    const layout = this.layoutEngine.calculateLayout(targetTree);
    const positionMap = new Map<string, { x: number; y: number }>();

    for (const [nodeId, pos] of layout.nodes.entries()) {
      positionMap.set(nodeId, { x: pos.x, y: pos.y });
    }

    return positionMap;
  }

  /**
   * Set tree (for explicit tree updates).
   */
  setTree(tree: MagicSkillTree): void {
    this.tree = tree;
    this.clearCache();
  }

  /**
   * Set evaluation results (for pre-computed evaluations).
   */
  setEvaluationResults(results: Map<string, any>): void {
    this.evaluationResults = results;
  }

  /**
   * Set viewport scroll.
   */
  setScroll(x: number, y: number): void {
    this.viewport.offsetX = x;
    this.viewport.offsetY = y;
  }

  /**
   * Set viewport zoom.
   */
  setZoom(factor: number): void {
    // Clamp zoom to reasonable bounds
    this.viewport.zoom = Math.max(0.5, Math.min(3.0, factor));
  }

  /**
   * Get current zoom level.
   */
  getZoom(): number {
    return this.viewport.zoom;
  }

  /**
   * Handle mouse wheel zoom.
   */
  handleMouseWheel(delta: number): void {
    const zoomDelta = delta > 0 ? 0.1 : -0.1;
    this.setZoom(this.viewport.zoom + zoomDelta);
  }

  /**
   * Set hovered node.
   */
  setHoveredNode(nodeId: string | null): void {
    this.hoveredNodeId = nodeId;
  }

  /**
   * Get hovered node.
   */
  getHoveredNode(): string | null {
    return this.hoveredNodeId;
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
    const targetTree = tree || this.tree;
    const targetViewport = viewport || this.viewport;

    // Get layout and check each node's bounds
    const layout = this.getLayout(targetTree);

    for (const [nodeId, pos] of layout.nodes.entries()) {
      const nodeX = pos.x * targetViewport.zoom + targetViewport.offsetX;
      const nodeY = pos.y * targetViewport.zoom + targetViewport.offsetY;
      const nodeWidth = pos.width * targetViewport.zoom;
      const nodeHeight = pos.height * targetViewport.zoom;

      if (
        x >= nodeX &&
        x <= nodeX + nodeWidth &&
        y >= nodeY &&
        y <= nodeY + nodeHeight
      ) {
        return nodeId;
      }
    }

    return null;
  }

  /**
   * Handle mouse move (for hover).
   */
  handleMouseMove(
    x: number,
    y: number,
    tree?: MagicSkillTree,
    viewport?: Viewport
  ): void {
    const targetTree = tree || this.tree;
    const targetViewport = viewport || this.viewport;

    // Find node at position and update hover state
    const nodeId = this.handleClick(x, y, targetTree, targetViewport);
    this.hoveredNodeId = nodeId;
  }
}
