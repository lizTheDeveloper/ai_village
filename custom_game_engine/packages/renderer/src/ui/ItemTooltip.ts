export interface TooltipItem {
  itemId: string;
  quantity: number;
  name?: string;
  rarity?: string;
  type?: string;
  description?: string;
  value?: number;
  stats?: Record<string, number>;
  requirements?: Record<string, number>;
  quality?: number;
}

export interface TooltipContent {
  name: string;
  rarity?: string;
  type?: string;
  description?: string;
  value?: number;
  stats?: Record<string, number>;
  requirements?: Record<string, number>;
  statComparison?: Record<string, { current: number; new: number; diff: number }>;
}

export interface TooltipRenderLine {
  label: string;
  text: string;
  color: string;
}

export interface TooltipRendering {
  lines: TooltipRenderLine[];
  nameColor: string;
}

/**
 * Rarity color mappings from spec
 */
const RARITY_COLORS = {
  common: '#9d9d9d',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
  unique: '#e6cc80',
} as const;

const DEFAULT_RARITY_COLOR = '#9d9d9d';

/**
 * ItemTooltip handles rendering tooltips for inventory items
 */
export class ItemTooltip {
  private item: TooltipItem | null = null;
  private compareWith: Partial<TooltipItem> | null = null;
  private position: { x: number; y: number } = { x: 0, y: 0 };
  private screenBounds: { width: number; height: number } = { width: 800, height: 600 };

  constructor() {}

  /**
   * Set the item to display in tooltip
   */
  public setItem(item: TooltipItem | null, options?: { compareWith?: Partial<TooltipItem> }): void {
    if (!item) {
      throw new Error('ItemTooltip.setItem: item missing required');
    }

    if (!item.itemId) {
      throw new Error('ItemTooltip.setItem: item missing required field "itemId"');
    }

    this.item = item;

    // Handle comparison
    if (options?.compareWith !== undefined) {
      if (options.compareWith === null) {
        throw new Error('ItemTooltip.setItem: compareWith cannot be null');
      }
      this.compareWith = options.compareWith;
    } else {
      this.compareWith = null;
    }
  }

  /**
   * Get tooltip content
   */
  public getContent(): TooltipContent {
    if (!this.item) {
      throw new Error('ItemTooltip.getContent: no item set');
    }

    const content: TooltipContent = {
      name: this.item.name || this.formatItemName(this.item.itemId || 'unknown'),
      rarity: this.item.rarity,
      type: this.item.type,
      description: this.item.description,
      value: this.item.value,
      stats: this.item.stats,
      requirements: this.item.requirements,
    };

    // Add stat comparison if comparing with equipped item
    if (this.compareWith && this.item.stats && this.compareWith.stats) {
      content.statComparison = this.calculateStatComparison(this.item.stats, this.compareWith.stats);
    }

    return content;
  }

  /**
   * Get rendering data for tooltip (formatted lines with colors)
   */
  public getRendering(): TooltipRendering {
    if (!this.item) {
      throw new Error('ItemTooltip.getRendering: no item set');
    }

    const lines: TooltipRenderLine[] = [];
    const nameColor = this.getRarityColor(this.item.rarity || 'common');

    // Stats
    if (this.item.stats) {
      for (const [stat, value] of Object.entries(this.item.stats)) {
        let text = `${value}`;
        let color = 'white';

        // Add comparison
        if (this.compareWith?.stats && this.compareWith.stats[stat] !== undefined) {
          const diff = value - this.compareWith.stats[stat];
          if (diff > 0) {
            text += ` (+${diff})`;
            color = 'green';
          } else if (diff < 0) {
            text += ` (${diff})`;
            color = 'red';
          }
        }

        lines.push({
          label: this.formatStatName(stat),
          text,
          color,
        });
      }
    }

    return {
      lines,
      nameColor,
    };
  }

  /**
   * Set tooltip position (auto-adjusts to avoid screen edges)
   */
  public setPosition(x: number, y: number, screenBounds?: { screenWidth: number; screenHeight: number }): void {
    if (screenBounds) {
      this.screenBounds = {
        width: screenBounds.screenWidth,
        height: screenBounds.screenHeight,
      };
    }

    // Tooltip dimensions (approximate)
    const tooltipWidth = 200;
    const tooltipHeight = 150;
    const padding = 10;

    // Adjust x to keep on screen
    let adjustedX = x;
    if (x + tooltipWidth + padding > this.screenBounds.width) {
      adjustedX = x - tooltipWidth - padding;
    }

    // Adjust y to keep on screen
    let adjustedY = y;
    if (y + tooltipHeight + padding > this.screenBounds.height) {
      adjustedY = y - tooltipHeight - padding;
    }

    this.position = { x: adjustedX, y: adjustedY };
  }

  /**
   * Get tooltip position
   */
  public getPosition(): { x: number; y: number } {
    return { ...this.position };
  }

  // Private helper methods

  /**
   * Calculate stat comparison between new and equipped item
   */
  private calculateStatComparison(
    newStats: Record<string, number>,
    equippedStats: Record<string, number>
  ): Record<string, { current: number; new: number; diff: number }> {
    const comparison: Record<string, { current: number; new: number; diff: number }> = {};

    for (const [stat, newValue] of Object.entries(newStats)) {
      const currentValue = equippedStats[stat] || 0;
      comparison[stat] = {
        current: currentValue,
        new: newValue,
        diff: newValue - currentValue,
      };
    }

    return comparison;
  }

  /**
   * Get rarity color from spec
   */
  private getRarityColor(rarity: string): string {
    const key = rarity.toLowerCase() as keyof typeof RARITY_COLORS;
    return RARITY_COLORS[key] || DEFAULT_RARITY_COLOR;
  }

  /**
   * Format item ID into readable name
   */
  private formatItemName(itemId: string): string {
    return itemId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format stat name for display
   */
  private formatStatName(stat: string): string {
    // Convert camelCase to Title Case
    const formatted = stat.replace(/([A-Z])/g, ' $1');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}
