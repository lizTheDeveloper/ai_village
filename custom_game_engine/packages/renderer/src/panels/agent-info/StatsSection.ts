/**
 * StatsSection - Renders the Stats tab showing gathering statistics.
 */

import type { SectionRenderContext, IdentityComponent, GatheringStatsComponentData } from './types.js';
import { getItemIcon, formatItemName, renderSeparator } from './renderUtils.js';

export class StatsSection {
  private scrollOffset = 0;

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  setScrollOffset(offset: number): void {
    this.scrollOffset = offset;
  }

  handleScroll(deltaY: number): void {
    if (deltaY > 0) {
      this.scrollOffset += 3;
    } else {
      this.scrollOffset = Math.max(0, this.scrollOffset - 3);
    }
  }

  render(
    context: SectionRenderContext,
    identity: IdentityComponent | undefined,
    gatheringStats: GatheringStatsComponentData | undefined
  ): void {
    const { ctx, x, y, width, height, padding, lineHeight } = context;

    // Save the context state for clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    let currentY = y + padding - this.scrollOffset;

    // Agent name
    if (identity?.name) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${identity.name}'s Stats`, x + padding, currentY + 14);
      currentY += 30;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('Agent Stats', x + padding, currentY + 12);
      currentY += 30;
    }

    if (!gatheringStats) {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('No stats available yet', x + padding, currentY);
      return;
    }

    // Today's Gathered section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('📥 Gathered Today', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = '12px monospace';
    const todayItems = Object.entries(gatheringStats.today);
    if (todayItems.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.fillText('Nothing yet', x + padding + 10, currentY);
      currentY += lineHeight;
    } else {
      for (const [itemId, count] of todayItems) {
        ctx.fillStyle = '#AAFFAA';
        const icon = getItemIcon(itemId);
        ctx.fillText(`${icon} ${formatItemName(itemId)}: ${count}`, x + padding + 10, currentY);
        currentY += lineHeight;
      }
    }
    currentY += 10;

    // All Time Gathered section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('📊 Gathered All Time', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = '12px monospace';
    const allTimeItems = Object.entries(gatheringStats.allTime);
    if (allTimeItems.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.fillText('Nothing yet', x + padding + 10, currentY);
      currentY += lineHeight;
    } else {
      for (const [itemId, count] of allTimeItems) {
        ctx.fillStyle = '#AADDFF';
        const icon = getItemIcon(itemId);
        ctx.fillText(`${icon} ${formatItemName(itemId)}: ${count}`, x + padding + 10, currentY);
        currentY += lineHeight;
      }
    }
    currentY += 10;

    // Divider
    renderSeparator(ctx, x, currentY, width, padding);
    currentY += 15;

    // Today's Deposited section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('📦 Deposited Today', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = '12px monospace';
    const depositedTodayItems = Object.entries(gatheringStats.depositedToday);
    if (depositedTodayItems.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.fillText('Nothing yet', x + padding + 10, currentY);
      currentY += lineHeight;
    } else {
      for (const [itemId, count] of depositedTodayItems) {
        ctx.fillStyle = '#FFDD88';
        const icon = getItemIcon(itemId);
        ctx.fillText(`${icon} ${formatItemName(itemId)}: ${count}`, x + padding + 10, currentY);
        currentY += lineHeight;
      }
    }
    currentY += 10;

    // All Time Deposited section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('🏆 Deposited All Time', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = '12px monospace';
    const depositedAllTimeItems = Object.entries(gatheringStats.depositedAllTime);
    if (depositedAllTimeItems.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.fillText('Nothing yet', x + padding + 10, currentY);
    } else {
      for (const [itemId, count] of depositedAllTimeItems) {
        ctx.fillStyle = '#FFD700';
        const icon = getItemIcon(itemId);
        ctx.fillText(`${icon} ${formatItemName(itemId)}: ${count}`, x + padding + 10, currentY);
        currentY += lineHeight;
      }
    }

    // Restore canvas state
    ctx.restore();
  }
}
