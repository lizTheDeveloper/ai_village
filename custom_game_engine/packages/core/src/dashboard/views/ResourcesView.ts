/**
 * ResourcesView - Village stockpile display
 *
 * Shows resources stored in storage buildings.
 * Available in both player UI (canvas) and LLM dashboard (curl).
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { getResourceColor, getResourceIcon, createProgressBar } from '../theme.js';

/**
 * Data returned by the Resources view
 */
export interface ResourcesViewData extends ViewData {
  /** Resources keyed by item ID with quantities */
  resources: Record<string, number>;
  /** Storage building info, or null if no storage buildings */
  storageInfo: {
    buildingCount: number;
    usedSlots: number;
    totalSlots: number;
  } | null;
}

/**
 * Resources View Definition
 */
export const ResourcesView: DashboardView<ResourcesViewData> = {
  id: 'resources',
  title: 'Village Stockpile',
  category: 'economy',
  keyboardShortcut: 'R',
  description: 'Shows resources stored in village storage buildings',

  defaultSize: {
    width: 250,
    height: 200,
    minWidth: 200,
    minHeight: 150,
  },

  getData(context: ViewContext): ResourcesViewData {
    const { world } = context;

    // Handle missing world
    if (!world || typeof world.query !== 'function') {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: 'Game world not available',
        resources: {},
        storageInfo: null,
      };
    }

    const resources: Record<string, number> = {};
    let buildingCount = 0;
    let usedSlots = 0;
    let totalSlots = 0;

    try {
      // Find all storage buildings
      const storageBuildings = world.query()
        .with('building')
        .with('inventory')
        .executeEntities();

      for (const storage of storageBuildings) {
        const building = storage.components.get('building');
        const inventory = storage.components.get('inventory');

        // Only count complete storage buildings - use type assertion for component data
        const buildingData = building as unknown as { isComplete?: boolean; buildingType?: string };
        if (!buildingData?.isComplete) continue;
        if (buildingData.buildingType !== 'storage-chest' && buildingData.buildingType !== 'storage-box') {
          continue;
        }

        buildingCount++;

        const inventoryData = inventory as unknown as { slots?: Array<{ itemId?: string; quantity: number }>; maxSlots?: number };
        if (inventoryData?.slots) {
          totalSlots += inventoryData.maxSlots || inventoryData.slots.length;
          for (const slot of inventoryData.slots) {
            if (slot.itemId && slot.quantity > 0) {
              resources[slot.itemId] = (resources[slot.itemId] || 0) + slot.quantity;
              usedSlots++;
            }
          }
        }
      }
    } catch (error) {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        resources: {},
        storageInfo: null,
      };
    }

    return {
      timestamp: Date.now(),
      available: true,
      resources,
      storageInfo: buildingCount > 0 ? { buildingCount, usedSlots, totalSlots } : null,
    };
  },

  textFormatter(data: ResourcesViewData): string {
    const lines: string[] = [
      'VILLAGE STOCKPILE',
      '═'.repeat(40),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Data unavailable');
      return lines.join('\n');
    }

    const resourceEntries = Object.entries(data.resources).sort((a, b) => a[0].localeCompare(b[0]));
    const totalItems = resourceEntries.reduce((sum, [, qty]) => sum + qty, 0);

    if (resourceEntries.length === 0) {
      lines.push('The village stockpile is empty.');
      lines.push('');
      if (!data.storageInfo) {
        lines.push('No storage buildings have been constructed yet.');
        lines.push('Build a storage chest or storage box to begin storing resources.');
      } else {
        lines.push('Storage buildings are ready but contain no items.');
      }
    } else {
      // Summary sentence
      lines.push(`The village has ${totalItems} items across ${resourceEntries.length} resource types:`);
      lines.push('');

      // Group by category for better description
      for (const [itemId, quantity] of resourceEntries) {
        const icon = getResourceIcon(itemId);
        // Make it more descriptive
        if (quantity === 1) {
          lines.push(`  ${icon} ${quantity} ${itemId}`);
        } else {
          lines.push(`  ${icon} ${quantity} ${itemId}`);
        }
      }
    }

    if (data.storageInfo) {
      lines.push('');
      lines.push('─'.repeat(40));
      const { buildingCount, usedSlots, totalSlots } = data.storageInfo;
      const utilization = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;
      const freeSlots = totalSlots - usedSlots;

      // Descriptive storage status
      const buildingWord = buildingCount === 1 ? 'building' : 'buildings';
      lines.push(`Storage: ${buildingCount} ${buildingWord} with ${totalSlots} total slots`);

      if (utilization >= 90) {
        lines.push(`WARNING: Storage nearly full! Only ${freeSlots} slots remaining.`);
      } else if (utilization >= 70) {
        lines.push(`Storage is ${utilization}% full. ${freeSlots} slots available.`);
      } else {
        lines.push(`Plenty of space available: ${freeSlots} of ${totalSlots} slots free.`);
      }
      lines.push(`${createProgressBar(utilization, 30)}`);
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: ResourcesViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // Handle unavailable
    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(data.unavailableReason || 'Data unavailable', x + padding, currentY);
      return;
    }

    // Handle empty
    const resourceEntries = Object.entries(data.resources).sort((a, b) => a[0].localeCompare(b[0]));

    if (resourceEntries.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No storage or empty stockpile', x + padding, currentY);
      currentY += lineHeight;
      ctx.fillText('Build storage buildings to store resources', x + padding, currentY);
      return;
    }

    // Render resources
    for (const [itemId, quantity] of resourceEntries) {
      const icon = getResourceIcon(itemId);
      const color = getResourceColor(itemId);

      ctx.fillStyle = color;
      ctx.fillText(`${icon} ${itemId}: ${quantity}`, x + padding, currentY);
      currentY += lineHeight;
    }

    // Storage info
    if (data.storageInfo) {
      currentY += 5;
      ctx.fillStyle = theme.colors.textMuted;
      ctx.font = '12px monospace';
      const { buildingCount, usedSlots, totalSlots } = data.storageInfo;
      ctx.fillText(
        `${buildingCount} storage(s) • ${usedSlots}/${totalSlots} slots`,
        x + padding,
        currentY
      );
    }
  },
};
