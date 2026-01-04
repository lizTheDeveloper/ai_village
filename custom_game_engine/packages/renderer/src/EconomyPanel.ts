import type {
  World,
  MarketStateComponent,
  ItemMarketStats,
} from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

/**
 * UI Panel displaying economy and market information.
 * Shows village-wide economic stats, price trends, and market activity.
 * Toggle with 'E' key.
 */
export class EconomyPanel implements IWindowPanel {
  private visible: boolean = false;
  private panelWidth = 400;
  private panelHeight = 500;
  private padding = 12;
  private lineHeight = 16;

  /**
   * Toggle panel visibility.
   */

  getId(): string {
    return 'economy';
  }

  getTitle(): string {
    return 'Economy';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 500;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  toggle(): void {
    this.visible = !this.visible;
  }

  /**
   * Check if panel is visible.
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Render the economy panel.
   * @param ctx Canvas rendering context
   * @param canvasWidth Width of the canvas
   * @param canvasHeight Height of the canvas
   * @param world World instance to query economy data
   */
  render(ctx: CanvasRenderingContext2D, _canvasWidth: number, _canvasHeight: number, world: World): void {
    if (!this.visible) {
      return; // Nothing to render
    }

    // Guard against undefined world
    if (!world || typeof world.query !== 'function') {
      console.warn('[EconomyPanel] World not available or missing query method');
      return;
    }

    // WindowManager handles positioning via translate, so render at (0, 0)
    const x = 0;
    const y = 0;

    // Get market state component
    const marketState = this.getMarketState(world);

    // Render content
    let currentY = y + this.padding;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Economy Dashboard', x + this.padding, currentY + 14);
    currentY += 26;

    // Check if market state exists
    if (!marketState) {
      ctx.fillStyle = '#FF6666';
      ctx.font = '12px monospace';
      ctx.fillText('No market state available', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      // Help text at bottom
      const helpY = y + this.panelHeight - 20;
      ctx.fillStyle = '#888888';
      ctx.font = '11px monospace';
      ctx.fillText('Press E to close', x + this.padding, helpY);
      return;
    }

    // Village Economy Overview
    this.renderSeparator(ctx, x, currentY);
    currentY += 10;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('💰 Village Economy', x + this.padding, currentY);
    currentY += this.lineHeight + 5;

    // Total currency in circulation
    ctx.fillStyle = '#FFCC66';
    ctx.font = '12px monospace';
    ctx.fillText(`Currency in circulation: ${marketState.totalCurrency.toFixed(0)}`, x + this.padding, currentY);
    currentY += this.lineHeight + 3;

    // Transaction volumes
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '11px monospace';
    ctx.fillText(`Daily volume: ${marketState.dailyTransactionVolume.toFixed(0)}`, x + this.padding, currentY);
    currentY += this.lineHeight;
    ctx.fillText(`Weekly volume: ${marketState.weeklyTransactionVolume.toFixed(0)}`, x + this.padding, currentY);
    currentY += this.lineHeight;

    // Inflation rate
    const inflationColor = marketState.inflationRate > 0.1 ? '#FF6666' : marketState.inflationRate < -0.05 ? '#6666FF' : '#88FF88';
    ctx.fillStyle = inflationColor;
    const inflationPercent = (marketState.inflationRate * 100).toFixed(1);
    const inflationText = marketState.inflationRate >= 0 ? `+${inflationPercent}%` : `${inflationPercent}%`;
    ctx.fillText(`Inflation rate: ${inflationText}`, x + this.padding, currentY);
    currentY += this.lineHeight + 8;

    // Market Activity
    this.renderSeparator(ctx, x, currentY);
    currentY += 10;

    ctx.fillStyle = '#88CCFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('📊 Market Activity', x + this.padding, currentY);
    currentY += this.lineHeight + 5;

    // Get top items by trading activity
    const topItems = this.getTopTradedItems(marketState, 5);

    if (topItems.length === 0) {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '11px monospace';
      ctx.fillText('No market activity yet', x + this.padding, currentY);
      currentY += this.lineHeight + 5;
    } else {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '11px monospace';
      ctx.fillText(`Top ${topItems.length} traded items:`, x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      // Render each item
      for (const stats of topItems) {
        currentY = this.renderItemStats(ctx, x, currentY, stats);
        if (currentY > y + this.panelHeight - 50) break; // Don't overflow panel
      }
    }

    // Supply & Demand Indicators
    if (currentY < y + this.panelHeight - 150) {
      this.renderSeparator(ctx, x, currentY);
      currentY += 10;

      ctx.fillStyle = '#FFAA66';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('📈 Supply & Demand', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      // Show supply/demand for top items
      for (const stats of topItems.slice(0, 3)) {
        currentY = this.renderSupplyDemand(ctx, x, currentY, stats);
        if (currentY > y + this.panelHeight - 50) break;
      }
    }

    // Help text at bottom
    const helpY = y + this.panelHeight - 20;
    ctx.fillStyle = '#888888';
    ctx.font = '11px monospace';
    ctx.fillText('Press E to close', x + this.padding, helpY);
  }

  /**
   * Get the market state component from the world
   */
  private getMarketState(world: World): MarketStateComponent | undefined {
    // Query for entity with market_state component
    const entities = world.query().with('market_state').executeEntities();
    if (entities.length === 0) {
      return undefined;
    }
    const marketEntity = entities[0];
    if (!marketEntity) {
      return undefined;
    }
    return marketEntity.components.get('market_state') as MarketStateComponent | undefined;
  }

  /**
   * Get top traded items sorted by recent activity
   */
  private getTopTradedItems(marketState: MarketStateComponent, limit: number): ItemMarketStats[] {
    const items = Array.from(marketState.itemStats.values());

    // Sort by total trading activity (sales + purchases)
    items.sort((a: ItemMarketStats, b: ItemMarketStats) => {
      const activityA = a.recentSales + a.recentPurchases;
      const activityB = b.recentSales + b.recentPurchases;
      return activityB - activityA;
    });

    return items.slice(0, limit);
  }

  /**
   * Render market stats for a single item
   */
  private renderItemStats(ctx: CanvasRenderingContext2D, panelX: number, y: number, stats: ItemMarketStats): number {
    // Item name and average price
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${stats.itemId}`, panelX + this.padding, y);

    // Average price on same line
    ctx.fillStyle = '#88FF88';
    const priceText = `${stats.averagePrice.toFixed(1)}`;
    const itemNameWidth = ctx.measureText(stats.itemId).width;
    ctx.fillText(priceText, panelX + this.padding + itemNameWidth + 10, y);
    y += this.lineHeight;

    // Supply and recent activity
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '10px monospace';
    ctx.fillText(`  Supply: ${stats.totalSupply}`, panelX + this.padding, y);
    y += this.lineHeight;

    ctx.fillText(`  Sales: ${stats.recentSales} | Purchases: ${stats.recentPurchases}`, panelX + this.padding, y);
    y += this.lineHeight;

    // Price trend indicator
    const priceTrend = this.getPriceTrend(stats);
    ctx.fillStyle = priceTrend.color;
    ctx.fillText(`  Trend: ${priceTrend.text}`, panelX + this.padding, y);
    y += this.lineHeight + 3;

    return y;
  }

  /**
   * Render supply/demand indicators for an item
   */
  private renderSupplyDemand(ctx: CanvasRenderingContext2D, panelX: number, y: number, stats: ItemMarketStats): number {
    ctx.fillStyle = '#FFCC66';
    ctx.font = '11px monospace';
    ctx.fillText(`${stats.itemId}:`, panelX + this.padding, y);
    y += this.lineHeight;

    // Calculate supply/demand ratio
    const demandRatio = stats.recentSales / Math.max(stats.recentPurchases, 1);
    const supplyRatio = stats.totalSupply / Math.max(stats.recentSales, 1);

    // Demand indicator
    let demandText = '';
    let demandColor = '#AAAAAA';
    if (demandRatio > 2) {
      demandText = 'High demand ▲▲';
      demandColor = '#FF6666';
    } else if (demandRatio > 1.2) {
      demandText = 'Rising demand ▲';
      demandColor = '#FFAA66';
    } else if (demandRatio > 0.8) {
      demandText = 'Stable demand ━';
      demandColor = '#88FF88';
    } else if (demandRatio > 0.5) {
      demandText = 'Low demand ▼';
      demandColor = '#6699FF';
    } else {
      demandText = 'Very low demand ▼▼';
      demandColor = '#6666FF';
    }

    ctx.fillStyle = demandColor;
    ctx.font = '10px monospace';
    ctx.fillText(`  ${demandText}`, panelX + this.padding, y);
    y += this.lineHeight;

    // Supply indicator
    let supplyText = '';
    let supplyColor = '#AAAAAA';
    if (supplyRatio > 10) {
      supplyText = 'Oversupply ▼▼';
      supplyColor = '#6666FF';
    } else if (supplyRatio > 5) {
      supplyText = 'High supply ▼';
      supplyColor = '#6699FF';
    } else if (supplyRatio > 2) {
      supplyText = 'Adequate supply ━';
      supplyColor = '#88FF88';
    } else {
      supplyText = 'Low supply ▲';
      supplyColor = '#FFAA66';
    }

    ctx.fillStyle = supplyColor;
    ctx.fillText(`  ${supplyText}`, panelX + this.padding, y);
    y += this.lineHeight + 5;

    return y;
  }

  /**
   * Get price trend from price history
   */
  private getPriceTrend(stats: ItemMarketStats): { text: string; color: string } {
    if (stats.priceHistory.length < 2) {
      return { text: 'Stable ━', color: '#AAAAAA' };
    }

    // Compare recent prices to earlier prices
    const recentCount = Math.min(5, stats.priceHistory.length);
    const recentPrices = stats.priceHistory.slice(-recentCount);
    const recentAvg = recentPrices.reduce((sum: number, p: number) => sum + p, 0) / recentCount;

    const olderCount = Math.min(5, stats.priceHistory.length - recentCount);
    if (olderCount < 2) {
      return { text: 'Stable ━', color: '#AAAAAA' };
    }

    const olderPrices = stats.priceHistory.slice(-(recentCount + olderCount), -recentCount);
    const olderAvg = olderPrices.reduce((sum: number, p: number) => sum + p, 0) / olderCount;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) {
      return { text: 'Rising ▲▲', color: '#FF6666' };
    } else if (change > 0.05) {
      return { text: 'Up ▲', color: '#FFAA66' };
    } else if (change > -0.05) {
      return { text: 'Stable ━', color: '#88FF88' };
    } else if (change > -0.1) {
      return { text: 'Down ▼', color: '#6699FF' };
    } else {
      return { text: 'Falling ▼▼', color: '#6666FF' };
    }
  }

  /**
   * Render a separator line
   */
  private renderSeparator(ctx: CanvasRenderingContext2D, panelX: number, y: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(panelX + this.padding, y);
    ctx.lineTo(panelX + this.panelWidth - this.padding, y);
    ctx.stroke();
  }
}
