/**
 * ConditionRenderer - Renders unlock condition icons and text
 *
 * Displays:
 * - Condition icons (checkmark, X, question mark)
 * - Condition descriptions
 * - Progress bars for partial conditions
 * - Met/unmet status styling
 */

import type { ConditionResult } from '@ai-village/core/src/magic/MagicSkillTreeEvaluator.js';

export class ConditionRenderer {
  /**
   * Render a list of conditions.
   *
   * @param ctx Canvas rendering context
   * @param conditions Conditions to render
   * @param x Starting X position
   * @param y Starting Y position
   * @param width Available width
   * @param maxHeight Maximum height to use
   * @returns Height used
   */
  render(
    ctx: CanvasRenderingContext2D,
    conditions: ConditionResult[],
    x: number,
    y: number,
    width: number,
    maxHeight: number = Infinity
  ): number {
    if (!ctx) {
      throw new Error('Canvas context is required for ConditionRenderer');
    }

    if (!conditions || conditions.length === 0) {
      return 0;
    }

    let currentY = y;
    const lineHeight = 20;
    const maxConditions = Math.floor(maxHeight / lineHeight);

    // Filter out hidden conditions
    const visibleConditions = conditions.filter(c => !c.hidden);

    // Render each condition
    for (let i = 0; i < Math.min(visibleConditions.length, maxConditions); i++) {
      const condition = visibleConditions[i];
      if (!condition) continue;

      this.renderCondition(ctx, condition, x, currentY, width);
      currentY += lineHeight;
    }

    // If more conditions than can fit, show "..."
    if (visibleConditions.length > maxConditions) {
      ctx.fillStyle = '#cccccc';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('...', x + 20, currentY);
      currentY += lineHeight;
    }

    return currentY - y;
  }

  /**
   * Render a single condition.
   */
  private renderCondition(
    ctx: CanvasRenderingContext2D,
    condition: ConditionResult,
    x: number,
    y: number,
    width: number
  ): void {
    // Render icon
    const icon = condition.met ? '✓' : '✗';
    const iconColor = condition.met ? '#00ff00' : '#ff6666';

    ctx.fillStyle = iconColor;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(icon, x, y);

    // Render description
    const textX = x + 20;
    const textWidth = width - 20;

    let description = condition.message || condition.condition.description;
    ctx.font = '12px sans-serif';
    let descWidth = ctx.measureText(description).width;

    // Truncate if too long
    if (descWidth > textWidth) {
      while (descWidth > textWidth && description.length > 3) {
        description = description.slice(0, -1);
        descWidth = ctx.measureText(description + '...').width;
      }
      description = description + '...';
    }

    ctx.fillStyle = condition.met ? '#cccccc' : '#999999';
    ctx.fillText(description, textX, y);

    // Render progress bar if partial condition
    if (condition.progress !== undefined && condition.progress > 0 && condition.progress < 1) {
      const barX = textX;
      const barY = y + 14;
      const barWidth = Math.min(100, textWidth);
      const barHeight = 3;

      // Background
      ctx.fillStyle = '#444444';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Progress
      ctx.fillStyle = '#00aaff';
      ctx.fillRect(barX, barY, barWidth * condition.progress, barHeight);
    }
  }

  /**
   * Calculate height needed for a list of conditions.
   */
  calculateHeight(conditions: ConditionResult[], maxHeight: number = Infinity): number {
    if (!conditions || conditions.length === 0) {
      return 0;
    }

    const lineHeight = 20;
    const visibleConditions = conditions.filter(c => !c.hidden);
    const maxConditions = Math.floor(maxHeight / lineHeight);

    let count = Math.min(visibleConditions.length, maxConditions);
    if (visibleConditions.length > maxConditions) {
      count += 1; // "..." line
    }

    return count * lineHeight;
  }
}
