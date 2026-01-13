/**
 * NodeTooltip - Renders detailed tooltips for skill nodes
 *
 * Shows:
 * - Node name and description
 * - Unlock conditions with met/unmet status
 * - XP cost
 * - Effects that will be applied
 * - Current level / max level
 */

import type { MagicSkillNode, NodeEvaluationResult } from '@ai-village/magic';
import { ConditionRenderer } from './ConditionRenderer.js';

export class NodeTooltip {
  private conditionRenderer: ConditionRenderer;

  constructor() {
    this.conditionRenderer = new ConditionRenderer();
  }

  /**
   * Render a tooltip for a node.
   *
   * @param ctx Canvas rendering context
   * @param node Node to show tooltip for
   * @param evaluation Evaluation result
   * @param anchorX Anchor X position (center of tooltip arrow)
   * @param anchorY Anchor Y position (top of tooltip)
   * @param maxWidth Maximum tooltip width
   * @returns Tooltip bounds
   */
  render(
    ctx: CanvasRenderingContext2D,
    node: MagicSkillNode,
    evaluation: NodeEvaluationResult,
    anchorX: number,
    anchorY: number,
    maxWidth: number = 300
  ): { x: number; y: number; width: number; height: number } {
    if (!ctx) {
      throw new Error('Canvas context is required for NodeTooltip');
    }
    if (!node) {
      throw new Error('Node is required for NodeTooltip');
    }
    if (!evaluation) {
      throw new Error('Evaluation is required for NodeTooltip');
    }

    const padding = 10;
    const lineHeight = 18;

    // Calculate content height
    let contentHeight = 0;
    let lines: Array<{ text: string; font: string; color: string; indent: number }> = [];

    // Title
    lines.push({ text: node.name, font: 'bold 14px sans-serif', color: '#ffffff', indent: 0 });
    contentHeight += lineHeight;

    // Description (wrapped)
    if (node.description) {
      const descLines = this.wrapText(ctx, node.description, maxWidth - (padding * 2), '12px sans-serif');
      for (const line of descLines) {
        lines.push({ text: line, font: '12px sans-serif', color: '#cccccc', indent: 0 });
        contentHeight += lineHeight;
      }
    }

    // Spacer
    contentHeight += lineHeight / 2;

    // XP Cost
    lines.push({
      text: `Cost: ${evaluation.xpCost} XP (${evaluation.availableXp} available)`,
      font: 'bold 12px sans-serif',
      color: evaluation.canPurchase ? '#00ff00' : '#ff6666',
      indent: 0,
    });
    contentHeight += lineHeight;

    // Level
    if (node.maxLevel > 1) {
      lines.push({
        text: `Level: ${evaluation.currentLevel}/${evaluation.maxLevel}`,
        font: '12px sans-serif',
        color: '#cccccc',
        indent: 0,
      });
      contentHeight += lineHeight;
    }

    // Conditions header
    if (evaluation.conditions.length > 0) {
      contentHeight += lineHeight / 2; // Spacer
      lines.push({
        text: 'Requirements:',
        font: 'bold 12px sans-serif',
        color: '#ffffff',
        indent: 0,
      });
      contentHeight += lineHeight;

      // Check if we have 10+ conditions - show scroll indicator
      const maxVisibleConditions = 10;
      const hasMoreConditions = evaluation.conditions.length > maxVisibleConditions;

      // Conditions will be rendered separately (limit to first 10)
      const visibleConditions = hasMoreConditions
        ? evaluation.conditions.slice(0, maxVisibleConditions)
        : evaluation.conditions;
      const conditionsHeight = this.conditionRenderer.calculateHeight(visibleConditions, 200);
      contentHeight += conditionsHeight;

      // Add scroll indicator if there are more
      if (hasMoreConditions) {
        lines.push({
          text: `↓ ${evaluation.conditions.length - maxVisibleConditions} more...`,
          font: '12px sans-serif',
          color: '#888888',
          indent: 0,
        });
        contentHeight += lineHeight;
      }
    }

    // Effects
    if (node.effects && node.effects.length > 0) {
      contentHeight += lineHeight / 2; // Spacer
      lines.push({
        text: 'Effects:',
        font: 'bold 12px sans-serif',
        color: '#ffffff',
        indent: 0,
      });
      contentHeight += lineHeight;

      for (const effect of node.effects.slice(0, 3)) {
        const effectDesc = this.formatEffect(effect);
        lines.push({
          text: `• ${effectDesc}`,
          font: '12px sans-serif',
          color: '#aaffaa',
          indent: 10,
        });
        contentHeight += lineHeight;
      }

      if (node.effects.length > 3) {
        lines.push({
          text: `... and ${node.effects.length - 3} more`,
          font: '12px sans-serif',
          color: '#888888',
          indent: 10,
        });
        contentHeight += lineHeight;
      }
    }

    // Calculate tooltip dimensions
    const tooltipWidth = maxWidth;
    const tooltipHeight = contentHeight + (padding * 2);
    const tooltipX = anchorX - (tooltipWidth / 2);
    const tooltipY = anchorY - tooltipHeight - 10; // 10px above anchor

    // Draw tooltip background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // Draw tooltip border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // Draw arrow pointing down to anchor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 5);
    ctx.lineTo(anchorX - 5, anchorY - 10);
    ctx.lineTo(anchorX + 5, anchorY - 10);
    ctx.closePath();
    ctx.fill();

    // Render text lines
    let currentY = tooltipY + padding;
    for (const line of lines) {
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(line.text, tooltipX + padding + line.indent, currentY);
      currentY += lineHeight;
    }

    // Render conditions (limit to first 10 if there are more)
    if (evaluation.conditions.length > 0) {
      const maxVisibleConditions = 10;
      const visibleConditions = evaluation.conditions.length > maxVisibleConditions
        ? evaluation.conditions.slice(0, maxVisibleConditions)
        : evaluation.conditions;

      this.conditionRenderer.render(
        ctx,
        visibleConditions,
        tooltipX + padding,
        currentY,
        tooltipWidth - (padding * 2),
        200
      );
    }

    return {
      x: tooltipX,
      y: tooltipY,
      width: tooltipWidth,
      height: tooltipHeight,
    };
  }

  /**
   * Wrap text to fit within max width.
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: string): string[] {
    ctx.font = font;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
      const width = ctx.measureText(testLine).width;

      if (width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Format an effect for display.
   */
  private formatEffect(effect: any): string {
    // Simple formatting based on effect type
    switch (effect.type) {
      case 'unlock_spell':
        return `Learn spell: ${effect.spellId || 'unknown'}`;
      case 'stat_boost':
        return `${effect.statType || 'stat'} +${effect.baseValue || 0}`;
      case 'unlock_technique':
        return `Unlock technique: ${effect.techniqueId || 'unknown'}`;
      case 'unlock_form':
        return `Unlock form: ${effect.formId || 'unknown'}`;
      default:
        return `${effect.type} (${effect.baseValue || 0})`;
    }
  }
}
