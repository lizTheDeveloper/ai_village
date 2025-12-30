/**
 * EconomyView - Village economy and market information
 *
 * Shows economic stats, price trends, supply/demand indicators.
 * Accessibility-first: describes economic health in plain language.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';

/**
 * Market stats for a single item
 */
interface ItemStats {
  itemId: string;
  averagePrice: number;
  totalSupply: number;
  recentSales: number;
  recentPurchases: number;
  priceHistory: number[];
}

/**
 * Data returned by the Economy view
 */
export interface EconomyViewData extends ViewData {
  /** Total currency in circulation */
  totalCurrency: number;
  /** Daily transaction volume */
  dailyVolume: number;
  /** Weekly transaction volume */
  weeklyVolume: number;
  /** Inflation rate (-1 to 1, where 0.1 = 10%) */
  inflationRate: number;
  /** Top traded items with their stats */
  topItems: ItemStats[];
  /** Whether market state exists */
  hasMarket: boolean;
}

/**
 * Get price trend description
 */
function getPriceTrend(stats: ItemStats): { text: string; direction: 'up' | 'down' | 'stable' } {
  if (stats.priceHistory.length < 2) {
    return { text: 'stable', direction: 'stable' };
  }

  const recentCount = Math.min(5, stats.priceHistory.length);
  const recentPrices = stats.priceHistory.slice(-recentCount);
  const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentCount;

  const olderCount = Math.min(5, stats.priceHistory.length - recentCount);
  if (olderCount < 2) {
    return { text: 'stable', direction: 'stable' };
  }

  const olderPrices = stats.priceHistory.slice(-(recentCount + olderCount), -recentCount);
  const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderCount;

  const change = (recentAvg - olderAvg) / olderAvg;

  if (change > 0.1) return { text: 'rising sharply', direction: 'up' };
  if (change > 0.05) return { text: 'rising', direction: 'up' };
  if (change > -0.05) return { text: 'stable', direction: 'stable' };
  if (change > -0.1) return { text: 'falling', direction: 'down' };
  return { text: 'falling sharply', direction: 'down' };
}

/**
 * Get demand description
 */
function getDemandDescription(stats: ItemStats): string {
  const demandRatio = stats.recentSales / Math.max(stats.recentPurchases, 1);
  if (demandRatio > 2) return 'very high demand';
  if (demandRatio > 1.2) return 'high demand';
  if (demandRatio > 0.8) return 'balanced';
  if (demandRatio > 0.5) return 'low demand';
  return 'very low demand';
}

/**
 * Economy View Definition
 */
export const EconomyView: DashboardView<EconomyViewData> = {
  id: 'economy',
  title: 'Economy Dashboard',
  category: 'economy',
  keyboardShortcut: 'E',
  description: 'Shows village economic health, market activity, and price trends',

  defaultSize: {
    width: 400,
    height: 500,
    minWidth: 350,
    minHeight: 400,
  },

  getData(context: ViewContext): EconomyViewData {
    const { world } = context;

    // Handle missing world
    if (!world || typeof world.query !== 'function') {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: 'Game world not available',
        totalCurrency: 0,
        dailyVolume: 0,
        weeklyVolume: 0,
        inflationRate: 0,
        topItems: [],
        hasMarket: false,
      };
    }

    try {
      // Query for market state entity
      const marketEntities = world.query()
        .with('market_state')
        .executeEntities();

      if (marketEntities.length === 0) {
        return {
          timestamp: Date.now(),
          available: true,
          totalCurrency: 0,
          dailyVolume: 0,
          weeklyVolume: 0,
          inflationRate: 0,
          topItems: [],
          hasMarket: false,
        };
      }

      const marketState = marketEntities[0]?.components.get('market_state') as unknown as {
        totalCurrency: number;
        dailyTransactionVolume: number;
        weeklyTransactionVolume: number;
        inflationRate: number;
        itemStats: Map<string, ItemStats>;
      } | undefined;

      if (!marketState) {
        return {
          timestamp: Date.now(),
          available: true,
          totalCurrency: 0,
          dailyVolume: 0,
          weeklyVolume: 0,
          inflationRate: 0,
          topItems: [],
          hasMarket: false,
        };
      }

      // Get top traded items
      const items = Array.from(marketState.itemStats?.values() || []);
      items.sort((a, b) => {
        const activityA = a.recentSales + a.recentPurchases;
        const activityB = b.recentSales + b.recentPurchases;
        return activityB - activityA;
      });

      return {
        timestamp: Date.now(),
        available: true,
        totalCurrency: marketState.totalCurrency || 0,
        dailyVolume: marketState.dailyTransactionVolume || 0,
        weeklyVolume: marketState.weeklyTransactionVolume || 0,
        inflationRate: marketState.inflationRate || 0,
        topItems: items.slice(0, 5),
        hasMarket: true,
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        totalCurrency: 0,
        dailyVolume: 0,
        weeklyVolume: 0,
        inflationRate: 0,
        topItems: [],
        hasMarket: false,
      };
    }
  },

  textFormatter(data: EconomyViewData): string {
    const lines: string[] = [
      'ECONOMY DASHBOARD',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Economic data unavailable');
      return lines.join('\n');
    }

    if (!data.hasMarket) {
      lines.push('No market has been established yet.');
      lines.push('');
      lines.push('The village economy will develop as villagers begin trading.');
      lines.push('Build shops and encourage commerce to see market data.');
      return lines.join('\n');
    }

    // Economic overview in natural language
    lines.push('ECONOMIC OVERVIEW');
    lines.push('─'.repeat(50));

    // Currency description
    const currencyDesc = data.totalCurrency > 1000
      ? 'The village has a healthy amount of currency in circulation.'
      : data.totalCurrency > 100
        ? 'Currency is flowing through the village economy.'
        : 'Currency circulation is limited.';
    lines.push(currencyDesc);
    lines.push(`  Total currency: ${data.totalCurrency.toFixed(0)} coins`);
    lines.push('');

    // Transaction activity
    if (data.dailyVolume > 0 || data.weeklyVolume > 0) {
      const activityLevel = data.dailyVolume > 50 ? 'bustling' :
        data.dailyVolume > 20 ? 'active' :
          data.dailyVolume > 5 ? 'modest' : 'quiet';
      lines.push(`Market activity is ${activityLevel}.`);
      lines.push(`  Daily trade volume: ${data.dailyVolume.toFixed(0)}`);
      lines.push(`  Weekly trade volume: ${data.weeklyVolume.toFixed(0)}`);
    } else {
      lines.push('No trading activity recorded recently.');
    }
    lines.push('');

    // Inflation
    const inflationPct = (data.inflationRate * 100).toFixed(1);
    if (data.inflationRate > 0.1) {
      lines.push(`⚠️  INFLATION WARNING: Prices are rising at ${inflationPct}%`);
      lines.push('   Consider increasing production or reducing currency supply.');
    } else if (data.inflationRate < -0.05) {
      lines.push(`📉 DEFLATION: Prices are falling at ${inflationPct}%`);
      lines.push('   Goods may become too cheap to produce profitably.');
    } else {
      lines.push(`Prices are stable (${inflationPct}% change).`);
    }
    lines.push('');

    // Top traded items
    if (data.topItems.length > 0) {
      lines.push('MARKET ACTIVITY');
      lines.push('─'.repeat(50));
      lines.push(`The ${data.topItems.length} most actively traded goods:`);
      lines.push('');

      for (const item of data.topItems) {
        const trend = getPriceTrend(item);
        const demand = getDemandDescription(item);

        lines.push(`  ${item.itemId.toUpperCase()}`);
        lines.push(`    Price: ${item.averagePrice.toFixed(1)} coins (${trend.text})`);
        lines.push(`    Supply: ${item.totalSupply} available, ${demand}`);
        lines.push(`    Recent trades: ${item.recentSales} sold, ${item.recentPurchases} bought`);
        lines.push('');
      }
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: EconomyViewData,
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

    // Handle no market
    if (!data.hasMarket) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No market established', x + padding, currentY);
      currentY += lineHeight;
      ctx.fillText('Trading will create market data', x + padding, currentY);
      return;
    }

    // Currency
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText(`💰 ${data.totalCurrency.toFixed(0)} coins in circulation`, x + padding, currentY);
    currentY += lineHeight + 5;

    // Transaction volumes
    ctx.font = theme.fonts.normal;
    ctx.fillStyle = theme.colors.text;
    ctx.fillText(`Daily volume: ${data.dailyVolume.toFixed(0)}`, x + padding, currentY);
    currentY += lineHeight;
    ctx.fillText(`Weekly volume: ${data.weeklyVolume.toFixed(0)}`, x + padding, currentY);
    currentY += lineHeight + 5;

    // Inflation
    const inflationColor = data.inflationRate > 0.1 ? theme.colors.error :
      data.inflationRate < -0.05 ? theme.colors.warning : theme.colors.success;
    ctx.fillStyle = inflationColor;
    const inflationPct = (data.inflationRate * 100).toFixed(1);
    ctx.fillText(`Inflation: ${inflationPct}%`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Top items
    if (data.topItems.length > 0) {
      ctx.fillStyle = theme.colors.accent;
      ctx.font = theme.fonts.bold;
      ctx.fillText('📊 Top Traded:', x + padding, currentY);
      currentY += lineHeight + 3;

      ctx.font = theme.fonts.normal;
      for (const item of data.topItems.slice(0, 3)) {
        const trend = getPriceTrend(item);
        const trendArrow = trend.direction === 'up' ? '▲' :
          trend.direction === 'down' ? '▼' : '━';
        const trendColor = trend.direction === 'up' ? theme.colors.error :
          trend.direction === 'down' ? theme.colors.success : theme.colors.textMuted;

        ctx.fillStyle = theme.colors.text;
        ctx.fillText(`${item.itemId}: ${item.averagePrice.toFixed(1)}`, x + padding, currentY);

        ctx.fillStyle = trendColor;
        ctx.fillText(` ${trendArrow}`, x + padding + 150, currentY);
        currentY += lineHeight;
      }
    }
  },
};
