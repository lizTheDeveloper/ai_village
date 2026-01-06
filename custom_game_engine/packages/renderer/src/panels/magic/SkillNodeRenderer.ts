/**
 * SkillNodeRenderer - Renders individual skill tree nodes
 *
 * Responsibilities:
 * - Draw node shape (rectangle, circle, hexagon, diamond)
 * - Apply correct colors based on state (unlocked/available/locked/hidden)
 * - Render node icon and name
 * - Show XP cost badge
 * - Render level indicator (for multi-level nodes)
 * - Handle hover highlighting and pulsing animations
 */

import type { MagicSkillNode, NodeEvaluationResult } from '@ai-village/magic';
import type { NodeRenderResult } from './types.js';
import { DEFAULT_NODE_COLORS, CATEGORY_SHAPES } from './types.js';

export class SkillNodeRenderer {
  /**
   * Render a skill node.
   *
   * @param ctx Canvas rendering context
   * @param node Node to render
   * @param evaluation Evaluation result for the node
   * @param x X position in screen coords
   * @param y Y position in screen coords
   * @param width Node width
   * @param height Node height
   * @param timestamp Animation timestamp (optional)
   * @param isHovered Is the node hovered? (optional)
   * @returns Render result with click bounds and tooltip anchor
   */
  render(
    ctx: CanvasRenderingContext2D | null,
    node: MagicSkillNode | null,
    evaluation: NodeEvaluationResult | null,
    x: number,
    y: number,
    width: number,
    height: number,
    timestamp: number = 0,
    isHovered: boolean = false
  ): NodeRenderResult {
    // Validation
    if (!ctx) {
      throw new Error('Canvas context is required');
    }
    if (!node) {
      throw new Error('Node is required');
    }
    if (!evaluation) {
      throw new Error('Evaluation is required');
    }

    // Determine node state
    const state = this.getNodeState(evaluation);

    // Handle hidden nodes
    if (!evaluation.visible) {
      this.renderHiddenNode(ctx, x, y, width, height);
      return {
        clickBounds: { x, y, width, height },
      };
    }

    // Render node shape
    const shape = CATEGORY_SHAPES[node.category] || 'square';
    this.renderNodeShape(ctx, shape, x, y, width, height, state, isHovered, timestamp);

    // Render node content
    this.renderNodeContent(ctx, node, evaluation, x, y, width, height);

    // Render XP cost (if not unlocked)
    if (evaluation.currentLevel < evaluation.maxLevel) {
      this.renderXPCost(ctx, evaluation.xpCost, x, y, width, height);
    }

    // Render level indicator (if multi-level)
    if (node.maxLevel > 1) {
      this.renderLevelIndicator(ctx, evaluation.currentLevel, evaluation.maxLevel, x, y, width, height);
    }

    // Render hover highlight
    if (isHovered) {
      this.renderHoverHighlight(ctx, shape, x, y, width, height);
    }

    return {
      clickBounds: { x, y, width, height },
      tooltipAnchor: isHovered ? { x: x + width / 2, y: y - 10 } : undefined,
    };
  }

  /**
   * Determine the state of a node (unlocked/available/locked).
   */
  private getNodeState(evaluation: NodeEvaluationResult): 'unlocked' | 'available' | 'locked' {
    if (evaluation.currentLevel >= evaluation.maxLevel) {
      return 'unlocked';
    }
    if (evaluation.canPurchase) {
      return 'available';
    }
    return 'locked';
  }

  /**
   * Render a hidden node as "???".
   */
  private renderHiddenNode(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Dark gray background
    ctx.fillStyle = DEFAULT_NODE_COLORS.hidden;
    ctx.fillRect(x, y, width, height);

    // "???" text
    ctx.fillStyle = '#cccccc';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('???', x + width / 2, y + height / 2);
  }

  /**
   * Render the node shape based on category.
   */
  private renderNodeShape(
    ctx: CanvasRenderingContext2D,
    shape: 'square' | 'circle' | 'hexagon' | 'diamond',
    x: number,
    y: number,
    width: number,
    height: number,
    state: 'unlocked' | 'available' | 'locked',
    _isHovered: boolean,
    timestamp: number
  ): void {
    // Determine fill color
    let fillColor = DEFAULT_NODE_COLORS.locked;
    if (state === 'unlocked') {
      fillColor = DEFAULT_NODE_COLORS.unlocked;
    } else if (state === 'available') {
      fillColor = DEFAULT_NODE_COLORS.available;
    }

    // Apply pulsing animation for available nodes
    if (state === 'available') {
      const pulseAlpha = 0.7 + 0.3 * Math.sin(timestamp * 0.005);
      ctx.globalAlpha = pulseAlpha;
    }

    // Draw shape
    ctx.fillStyle = fillColor;
    switch (shape) {
      case 'square':
        ctx.fillRect(x, y, width, height);
        break;
      case 'circle':
        this.drawCircle(ctx, x + width / 2, y + height / 2, Math.min(width, height) / 2);
        break;
      case 'hexagon':
        this.drawHexagon(ctx, x + width / 2, y + height / 2, Math.min(width, height) / 2);
        break;
      case 'diamond':
        this.drawDiamond(ctx, x + width / 2, y + height / 2, width, height);
        break;
    }

    // Reset alpha
    ctx.globalAlpha = 1.0;

    // Draw yellow glow for available nodes
    if (state === 'available') {
      ctx.strokeStyle = DEFAULT_NODE_COLORS.available;
      ctx.lineWidth = 3;
      switch (shape) {
        case 'square':
          ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
          break;
        case 'circle':
          this.strokeCircle(ctx, x + width / 2, y + height / 2, Math.min(width, height) / 2 + 2);
          break;
        default:
          ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
      }
    }
  }

  /**
   * Render node content (icon and name).
   */
  private renderNodeContent(
    ctx: CanvasRenderingContext2D,
    node: MagicSkillNode,
    _evaluation: NodeEvaluationResult,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Render icon if provided
    if (node.icon) {
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(node.icon, x + width / 2, y + height / 3);
    }

    // Render name (truncated if too long)
    let displayName = node.name;
    ctx.font = '12px sans-serif';
    const maxWidth = width - 10;
    let textWidth = ctx.measureText(displayName).width;

    if (textWidth > maxWidth) {
      // Truncate with "..."
      while (textWidth > maxWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
        textWidth = ctx.measureText(displayName + '...').width;
      }
      displayName = displayName + '...';
    }

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textY = node.icon ? y + (2 * height) / 3 : y + height / 2;
    ctx.fillText(displayName, x + width / 2, textY);

    // Add forbidden tint for forbidden category (if it becomes part of the type in the future)
    // Note: 'forbidden' is not currently in MagicSkillCategory type
    // if (node.category === 'forbidden') {
    //   ctx.fillStyle = DEFAULT_NODE_COLORS.forbidden;
    //   ctx.globalAlpha = 0.3;
    //   ctx.fillRect(x, y, width, height);
    //   ctx.globalAlpha = 1.0;
    // }
  }

  /**
   * Render XP cost badge.
   */
  private renderXPCost(
    ctx: CanvasRenderingContext2D,
    xpCost: number,
    x: number,
    y: number,
    width: number,
    _height: number
  ): void {
    const badgeX = x + width - 20;
    const badgeY = y + 5;
    const badgeRadius = 12;

    // Badge background
    ctx.fillStyle = '#4444aa';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    // XP cost text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(xpCost), badgeX, badgeY);
  }

  /**
   * Render level indicator (e.g., "3/5").
   */
  private renderLevelIndicator(
    ctx: CanvasRenderingContext2D,
    currentLevel: number,
    maxLevel: number,
    x: number,
    y: number,
    _width: number,
    _height: number
  ): void {
    const text = `${currentLevel}/${maxLevel}`;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x + 5, y + 5);
  }

  /**
   * Render hover highlight.
   */
  private renderHoverHighlight(
    ctx: CanvasRenderingContext2D,
    shape: 'square' | 'circle' | 'hexagon' | 'diamond',
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.strokeStyle = DEFAULT_NODE_COLORS.hoverBorder;
    ctx.lineWidth = 2;

    switch (shape) {
      case 'square':
        ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
        break;
      case 'circle':
        this.strokeCircle(ctx, x + width / 2, y + height / 2, Math.min(width, height) / 2 + 1);
        break;
      default:
        ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
    }
  }

  /**
   * Draw a circle.
   */
  private drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Stroke a circle.
   */
  private strokeCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Draw a hexagon.
   */
  private drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw a diamond.
   */
  private drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, height: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy - height / 2); // Top
    ctx.lineTo(cx + width / 2, cy);  // Right
    ctx.lineTo(cx, cy + height / 2); // Bottom
    ctx.lineTo(cx - width / 2, cy);  // Left
    ctx.closePath();
    ctx.fill();
  }
}
