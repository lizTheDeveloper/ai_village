/**
 * ShopView - Trading and shop interface
 *
 * Shows buying and selling options at trading posts.
 * Accessibility-first: describes trade options in narrative form.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';

/**
 * An item available for trade
 */
interface TradeItem {
  id: string;
  name: string;
  category: string;
  buyPrice: number | null;
  sellPrice: number | null;
  quantity: number;
  playerOwned: number;
  quality: string | null;
}

/**
 * Shop/trader information
 */
interface ShopInfo {
  id: string;
  name: string;
  type: 'general' | 'blacksmith' | 'alchemist' | 'farmer' | 'traveling';
  reputation: number;
  isOpen: boolean;
}

/**
 * Data returned by the Shop view
 */
export interface ShopViewData extends ViewData {
  /** Currently selected shop */
  shop: ShopInfo | null;
  /** Player's current gold/currency */
  playerGold: number;
  /** Items available to buy */
  buyableItems: TradeItem[];
  /** Items player can sell */
  sellableItems: TradeItem[];
  /** Recent transaction history */
  recentTransactions: {
    type: 'buy' | 'sell';
    itemName: string;
    quantity: number;
    price: number;
    timestamp: number;
  }[];
}

/**
 * Shop View Definition
 */
export const ShopView: DashboardView<ShopViewData> = {
  id: 'shop',
  title: 'Shop',
  category: 'economy',
  keyboardShortcut: undefined,
  description: 'Buy and sell items at trading posts and shops',

  defaultSize: {
    width: 400,
    height: 550,
    minWidth: 350,
    minHeight: 450,
  },

  getData(context: ViewContext): ShopViewData {
    const { world } = context;

    const emptyData: ShopViewData = {
      timestamp: Date.now(),
      available: false,
      unavailableReason: 'No shop selected',
      shop: null,
      playerGold: 0,
      buyableItems: [],
      sellableItems: [],
      recentTransactions: [],
    };

    if (!world) {
      emptyData.unavailableReason = 'No world available';
      return emptyData;
    }

    try {
      // In real implementation, query trading system state
      // Return placeholder structure
      return emptyData;
    } catch (error) {
      return {
        ...emptyData,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: ShopViewData): string {
    const lines: string[] = [
      'TRADING POST',
      '='.repeat(50),
      '',
    ];

    if (!data.available || !data.shop) {
      lines.push(data.unavailableReason || 'No shop available');
      lines.push('');
      lines.push('To access trading:');
      lines.push('  - Visit a trading post or merchant');
      lines.push('  - Click on a shop building');
      lines.push('  - Approach a traveling merchant');
      return lines.join('\n');
    }

    // Shop info
    lines.push(`${data.shop.name.toUpperCase()}`);
    lines.push('-'.repeat(50));

    const shopTypeDesc: Record<string, string> = {
      general: 'A general store with various goods',
      blacksmith: 'A smithy specializing in metal goods and tools',
      alchemist: 'An alchemy shop with potions and ingredients',
      farmer: 'A farm stand with fresh produce and seeds',
      traveling: 'A traveling merchant with exotic wares',
    };

    lines.push(shopTypeDesc[data.shop.type] || 'A trading establishment');

    if (!data.shop.isOpen) {
      lines.push('');
      lines.push('*** CLOSED ***');
      lines.push('This shop is currently closed. Please return later.');
      return lines.join('\n');
    }

    // Reputation
    const repDesc = data.shop.reputation >= 80 ? 'You are a valued customer here' :
      data.shop.reputation >= 50 ? 'You have a good reputation here' :
        data.shop.reputation >= 20 ? 'You are a known customer' :
          'You are new to this shop';
    lines.push(repDesc);
    lines.push('');

    // Player funds
    lines.push('YOUR FUNDS');
    lines.push('-'.repeat(50));
    lines.push(`Gold: ${data.playerGold}`);
    lines.push('');

    // Items to buy
    lines.push('ITEMS FOR SALE');
    lines.push('-'.repeat(50));

    if (data.buyableItems.length === 0) {
      lines.push('No items currently available for purchase.');
    } else {
      // Group by category
      const byCategory = new Map<string, TradeItem[]>();
      for (const item of data.buyableItems) {
        if (!byCategory.has(item.category)) {
          byCategory.set(item.category, []);
        }
        byCategory.get(item.category)!.push(item);
      }

      for (const [category, items] of byCategory) {
        lines.push(`  ${category.toUpperCase()}`);
        for (const item of items) {
          const price = item.buyPrice !== null ? `${item.buyPrice} gold` : 'not for sale';
          const stock = item.quantity > 0 ? `(${item.quantity} in stock)` : '(out of stock)';
          const qualityNote = item.quality ? ` [${item.quality}]` : '';
          const affordable = item.buyPrice !== null && data.playerGold >= item.buyPrice ? '' : ' *';

          lines.push(`    ${item.name}${qualityNote}: ${price} ${stock}${affordable}`);
        }
        lines.push('');
      }

      lines.push('* = cannot afford');
    }

    // Items to sell
    lines.push('YOUR ITEMS TO SELL');
    lines.push('-'.repeat(50));

    if (data.sellableItems.length === 0) {
      lines.push('You have nothing this merchant wants to buy.');
    } else {
      for (const item of data.sellableItems) {
        const price = item.sellPrice !== null ? `${item.sellPrice} gold each` : 'no offer';
        const qualityNote = item.quality ? ` [${item.quality}]` : '';
        lines.push(`  ${item.name}${qualityNote} x${item.playerOwned}: ${price}`);
      }
    }
    lines.push('');

    // Recent transactions
    if (data.recentTransactions.length > 0) {
      lines.push('RECENT TRANSACTIONS');
      lines.push('-'.repeat(50));

      for (const trans of data.recentTransactions.slice(0, 5)) {
        const action = trans.type === 'buy' ? 'Bought' : 'Sold';
        const direction = trans.type === 'buy' ? 'for' : 'for';
        lines.push(`  ${action} ${trans.quantity}x ${trans.itemName} ${direction} ${trans.price} gold`);
      }
    }

    // Instructions
    lines.push('');
    lines.push('HOW TO TRADE');
    lines.push('-'.repeat(50));
    lines.push('To buy: Click on an item in the "For Sale" section');
    lines.push('To sell: Click on an item in "Your Items" section');
    lines.push('Prices may vary based on your reputation and item quality.');

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: ShopViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    if (!data.available || !data.shop) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No shop selected', x + padding, currentY);
      ctx.fillText('Visit a trading post to trade', x + padding, currentY + lineHeight);
      return;
    }

    // Shop name
    ctx.fillStyle = '#FFD700';
    ctx.font = theme.fonts.bold;
    ctx.fillText(data.shop.name, x + padding, currentY);
    currentY += lineHeight + 5;

    // Open/closed status
    if (!data.shop.isOpen) {
      ctx.fillStyle = '#FF6B6B';
      ctx.fillText('CLOSED', x + padding, currentY);
      return;
    }

    // Gold
    ctx.font = theme.fonts.normal;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Your Gold: ${data.playerGold}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Buy section
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('For Sale', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    if (data.buyableItems.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('Nothing available', x + padding, currentY);
      currentY += lineHeight;
    } else {
      for (const item of data.buyableItems.slice(0, 4)) {
        const affordable = item.buyPrice !== null && data.playerGold >= item.buyPrice;
        ctx.fillStyle = affordable ? theme.colors.text : theme.colors.textMuted;
        ctx.fillText(`${item.name}: ${item.buyPrice}g`, x + padding, currentY);
        currentY += lineHeight;
      }
      if (data.buyableItems.length > 4) {
        ctx.fillStyle = theme.colors.textMuted;
        ctx.fillText(`... ${data.buyableItems.length - 4} more`, x + padding, currentY);
        currentY += lineHeight;
      }
    }

    currentY += 10;

    // Sell section
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('Your Items', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    if (data.sellableItems.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('Nothing to sell', x + padding, currentY);
    } else {
      for (const item of data.sellableItems.slice(0, 4)) {
        ctx.fillStyle = '#90EE90';
        ctx.fillText(`${item.name} x${item.playerOwned}: ${item.sellPrice}g`, x + padding, currentY);
        currentY += lineHeight;
      }
    }
  },
};
