/**
 * InventorySection - Renders the full Inventory tab with scrolling.
 */

import type { SectionRenderContext, IdentityComponent, InventoryComponentData } from './types.js';
import { getResourceIcon, formatItemLabel, countResourcesByType, renderSeparator } from './renderUtils.js';

export class InventorySection {
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
    inventory: InventoryComponentData | undefined
  ): void {
    const { ctx, x, y, width, height, padding, lineHeight } = context;

    let currentY = y + padding;

    // Agent name header
    if (identity?.name) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${identity.name}'s Items`, x + padding, currentY + 14);
      currentY += 30;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('Inventory', x + padding, currentY + 12);
      currentY += 30;
    }

    if (!inventory) {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('No inventory', x + padding, currentY);
      return;
    }

    // Capacity bar
    const weightPercent = (inventory.currentWeight / inventory.maxWeight) * 100;
    const usedSlots = inventory.slots.filter(s => s.itemId !== null && s.quantity > 0).length;
    const slotsPercent = (usedSlots / inventory.maxSlots) * 100;

    let capacityColor = '#FFFFFF';
    if (weightPercent >= 100 || slotsPercent >= 100) {
      capacityColor = '#FF0000';
    } else if (weightPercent >= 80 || slotsPercent >= 80) {
      capacityColor = '#FFFF00';
    }

    ctx.fillStyle = capacityColor;
    ctx.font = '11px monospace';
    ctx.fillText(
      `Weight: ${Math.round(inventory.currentWeight)}/${inventory.maxWeight}  Slots: ${usedSlots}/${inventory.maxSlots}`,
      x + padding,
      currentY
    );
    currentY += lineHeight + 10;

    // Divider
    renderSeparator(ctx, x, currentY, width, padding);
    currentY += 10;

    // Get all items and sort by quantity
    const resourceCounts = countResourcesByType(inventory.slots);
    const sortedItems = Object.entries(resourceCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    if (sortedItems.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('Empty', x + padding, currentY);
      return;
    }

    // Calculate visible area
    const itemHeight = lineHeight + 2;
    const visibleHeight = height - (currentY - y) - 20;
    const maxVisibleItems = Math.floor(visibleHeight / itemHeight);

    // Clamp scroll offset
    const maxScroll = Math.max(0, sortedItems.length - maxVisibleItems);
    this.scrollOffset = Math.min(this.scrollOffset, maxScroll);

    // Render visible items
    ctx.font = '12px monospace';
    for (
      let i = this.scrollOffset;
      i < sortedItems.length && i < this.scrollOffset + maxVisibleItems;
      i++
    ) {
      const [itemId, count] = sortedItems[i]!;
      const icon = getResourceIcon(itemId);
      const label = formatItemLabel(itemId);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${icon} ${label}: ${Math.round(count)}`, x + padding, currentY);
      currentY += itemHeight;
    }

    // Show scroll indicator if there are more items
    if (sortedItems.length > maxVisibleItems) {
      ctx.fillStyle = '#888888';
      ctx.font = '10px monospace';
      const scrollInfo = `Showing ${this.scrollOffset + 1}-${Math.min(this.scrollOffset + maxVisibleItems, sortedItems.length)} of ${sortedItems.length} (scroll for more)`;
      ctx.fillText(scrollInfo, x + padding, y + height - 10);
    }
  }

  /**
   * Categorize items by type for category summaries (used by Info tab).
   */
  static categorizeItems(
    resourceCounts: Record<string, number>
  ): Record<string, { total: number; items: string[] }> {
    const categories: Record<string, { total: number; items: string[] }> = {
      Food: { total: 0, items: [] },
      Materials: { total: 0, items: [] },
      Seeds: { total: 0, items: [] },
      Other: { total: 0, items: [] },
    };

    const foodItems = ['berry', 'wheat', 'apple', 'carrot', 'food', 'bread', 'fruit'];
    const materialItems = ['wood', 'stone', 'iron', 'copper', 'clay', 'fiber', 'plank', 'brick'];

    for (const [itemId, count] of Object.entries(resourceCounts)) {
      if (count <= 0) continue;

      if (itemId.endsWith('_seeds') || itemId.startsWith('seed:')) {
        categories['Seeds']!.total += count;
        categories['Seeds']!.items.push(itemId);
      } else if (foodItems.includes(itemId)) {
        categories['Food']!.total += count;
        categories['Food']!.items.push(itemId);
      } else if (materialItems.some(m => itemId.includes(m))) {
        categories['Materials']!.total += count;
        categories['Materials']!.items.push(itemId);
      } else {
        categories['Other']!.total += count;
        categories['Other']!.items.push(itemId);
      }
    }

    return categories;
  }
}
