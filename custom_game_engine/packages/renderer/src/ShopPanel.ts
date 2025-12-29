import type { World, ShopComponent, EntityId, InventoryComponent, CurrencyComponent } from '@ai-village/core';
import { EntityImpl } from '@ai-village/core';
import { itemRegistry, calculateBuyPrice, calculateSellPrice } from '@ai-village/core';

interface ShopItem {
  itemId: string;
  quantity: number;
  price: number;
  affordable: boolean;
}

interface SellableItem {
  itemId: string;
  quantity: number;
  price: number;
}

/**
 * Interactive panel for trading with shops
 */
export class ShopPanel {
  private visible = false;
  private selectedShopId: EntityId | null = null;
  private selectedAgentId: EntityId | null = null;
  private panelWidth = 500;
  private panelHeight = 600;
  private scrollOffset = 0;
  private maxScroll = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;

  // Click regions for buy/sell buttons
  private buyButtons: Array<{ itemId: string; x: number; y: number; width: number; height: number }> = [];
  private sellButtons: Array<{ itemId: string; x: number; y: number; width: number; height: number }> = [];

  openShop(shopId: EntityId, agentId: EntityId): void {
    if (!shopId) {
      throw new Error('Shop ID is required');
    }
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    this.selectedShopId = shopId;
    this.selectedAgentId = agentId;
    this.visible = true;
    this.scrollOffset = 0;
  }

  close(): void {
    this.visible = false;
    this.selectedShopId = null;
    this.selectedAgentId = null;
    this.scrollOffset = 0;
  }

  isVisible(): boolean {
    return this.visible;
  }

  handleScroll(deltaY: number): boolean {
    if (!this.visible) {
      return false;
    }

    this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset + deltaY));
    return true;
  }

  render(ctx: CanvasRenderingContext2D, world: World): void {
    if (!this.visible || !this.selectedShopId || !this.selectedAgentId) {
      return;
    }

    // Store canvas dimensions for click handling
    this.canvasWidth = ctx.canvas.width;
    this.canvasHeight = ctx.canvas.height;

    const shopEntity = world.getEntity(this.selectedShopId);
    if (!shopEntity) {
      this.close();
      return;
    }

    const shopImpl = shopEntity as EntityImpl;
    const shop = shopImpl.getComponent<ShopComponent>('shop');
    if (!shop) {
      this.close();
      return;
    }

    const agentEntity = world.getEntity(this.selectedAgentId);
    if (!agentEntity) {
      this.close();
      return;
    }

    const agentImpl = agentEntity as EntityImpl;
    const agentCurrency = agentImpl.getComponent<CurrencyComponent>('currency');
    const agentInventory = agentImpl.getComponent<InventoryComponent>('inventory');

    if (!agentCurrency || !agentInventory) {
      this.close();
      return;
    }

    // Get market state for pricing
    const marketEntities = world.query().with('market_state').executeEntities();
    const marketState = marketEntities.length > 0 && marketEntities[0]
      ? marketEntities[0].components.get('market_state') as any
      : undefined;

    // Calculate panel position (centered)
    const panelX = (ctx.canvas.width - this.panelWidth) / 2;
    const panelY = (ctx.canvas.height - this.panelHeight) / 2;

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw panel background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(panelX, panelY, this.panelWidth, this.panelHeight);

    // Draw panel border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, this.panelWidth, this.panelHeight);

    // Draw header
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(shop.name, panelX + 10, panelY + 30);

    // Draw close button
    const closeButtonX = panelX + this.panelWidth - 40;
    const closeButtonY = panelY + 10;
    ctx.fillStyle = '#c44';
    ctx.fillRect(closeButtonX, closeButtonY, 30, 30);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(closeButtonX, closeButtonY, 30, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('X', closeButtonX + 15, closeButtonY + 22);

    // Draw currency balance
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Your Currency: ${agentCurrency.balance}`, panelX + 10, panelY + 55);

    // Shop hours status
    const currentHour = Math.floor((world.tick / 1200) % 24);
    const isOpen = currentHour >= shop.openHours.start && currentHour < shop.openHours.end;
    ctx.fillStyle = isOpen ? '#4f4' : '#f44';
    ctx.fillText(
      isOpen ? 'Open' : `Closed (Opens ${shop.openHours.start}:00)`,
      panelX + 10,
      panelY + 75
    );

    if (!isOpen) {
      return; // Don't show shop content if closed
    }

    // Reset button arrays
    this.buyButtons = [];
    this.sellButtons = [];

    // Draw shop inventory section
    let yOffset = panelY + 95;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Shop Inventory (Buy)', panelX + 10, yOffset);
    yOffset += 20;

    // Get shop items with prices
    const shopItems: ShopItem[] = [];
    for (const stock of shop.stock) {
      if (stock.quantity <= 0) continue;

      const itemDef = itemRegistry.get(stock.itemId);
      if (!itemDef) continue;

      const price = calculateBuyPrice({ definition: itemDef }, shop, marketState);
      const affordable = agentCurrency.balance >= price;

      shopItems.push({
        itemId: stock.itemId,
        quantity: stock.quantity,
        price,
        affordable,
      });
    }

    // Render shop items
    for (const item of shopItems) {
      const itemDef = itemRegistry.get(item.itemId);
      if (!itemDef) continue;

      ctx.font = '14px sans-serif';
      ctx.fillStyle = item.affordable ? '#fff' : '#888';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${itemDef.displayName} x${item.quantity} - ${item.price} currency`,
        panelX + 20,
        yOffset
      );

      // Draw buy button
      const buttonX = panelX + this.panelWidth - 90;
      const buttonY = yOffset - 15;
      const buttonWidth = 70;
      const buttonHeight = 20;

      ctx.fillStyle = item.affordable ? '#4a4' : '#666';
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('Buy', buttonX + buttonWidth / 2, buttonY + 15);

      // Store button region
      this.buyButtons.push({
        itemId: item.itemId,
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
      });

      yOffset += 25;
    }

    if (shopItems.length === 0) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';
      ctx.fillText('No items for sale', panelX + 20, yOffset);
      yOffset += 25;
    }

    // Draw agent inventory section (items to sell)
    yOffset += 10;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Your Inventory (Sell)', panelX + 10, yOffset);
    yOffset += 20;

    // Get sellable items
    const sellableItems: SellableItem[] = [];
    const seenItems = new Set<string>();

    for (const slot of agentInventory.slots) {
      if (!slot.itemId || slot.quantity <= 0) continue;
      if (seenItems.has(slot.itemId)) continue;
      seenItems.add(slot.itemId);

      const itemDef = itemRegistry.get(slot.itemId);
      if (!itemDef) continue;

      const price = calculateSellPrice({ definition: itemDef }, shop, marketState);

      sellableItems.push({
        itemId: slot.itemId,
        quantity: slot.quantity,
        price,
      });
    }

    // Render sellable items
    for (const item of sellableItems) {
      const itemDef = itemRegistry.get(item.itemId);
      if (!itemDef) continue;

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${itemDef.displayName} x${item.quantity} - ${item.price} currency`,
        panelX + 20,
        yOffset
      );

      // Draw sell button
      const buttonX = panelX + this.panelWidth - 90;
      const buttonY = yOffset - 15;
      const buttonWidth = 70;
      const buttonHeight = 20;

      ctx.fillStyle = '#a44';
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('Sell', buttonX + buttonWidth / 2, buttonY + 15);

      // Store button region
      this.sellButtons.push({
        itemId: item.itemId,
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
      });

      yOffset += 25;
    }

    if (sellableItems.length === 0) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';
      ctx.fillText('No items to sell', panelX + 20, yOffset);
    }
  }

  handleClick(x: number, y: number, world: World, canvasWidth?: number, canvasHeight?: number): boolean {
    if (!this.visible || !this.selectedShopId || !this.selectedAgentId) {
      return false;
    }

    // Use provided dimensions or fallback to stored dimensions
    const width = canvasWidth || this.canvasWidth || 1600;
    const height = canvasHeight || this.canvasHeight || 900;

    const panelX = (width - this.panelWidth) / 2;
    const panelY = (height - this.panelHeight) / 2;

    // Check close button
    const closeButtonX = panelX + this.panelWidth - 40;
    const closeButtonY = panelY + 10;
    if (x >= closeButtonX && x <= closeButtonX + 30 &&
        y >= closeButtonY && y <= closeButtonY + 30) {
      this.close();
      return true;
    }

    // Check if click is outside panel
    if (x < panelX || x > panelX + this.panelWidth ||
        y < panelY || y > panelY + this.panelHeight) {
      this.close();
      return true;
    }

    // Check buy buttons
    for (const button of this.buyButtons) {
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
        this.handleBuy(world, button.itemId);
        return true;
      }
    }

    // Check sell buttons
    for (const button of this.sellButtons) {
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
        this.handleSell(world, button.itemId);
        return true;
      }
    }

    return false;
  }

  private handleBuy(world: World, itemId: string): void {
    if (!this.selectedShopId || !this.selectedAgentId) {
      return;
    }

    // Get TradingSystem
    const tradingSystem = (world as any).getSystem?.('trading');
    if (!tradingSystem || !('buyFromShop' in tradingSystem)) {
      console.error('TradingSystem not found');
      return;
    }

    // Buy one item
    const result = (tradingSystem as any).buyFromShop(
      world,
      this.selectedAgentId,
      this.selectedShopId,
      itemId,
      1
    );

    if (!result.success) {
      console.warn('Purchase failed:', result.reason);
      world.eventBus.emit({
        type: 'notification:show',
        source: 'shop-panel',
        data: {
          message: result.reason || 'Purchase failed',
          type: 'error',
          duration: 3000,
        },
      });
    } else {
      const itemDef = itemRegistry.get(itemId);
      world.eventBus.emit({
        type: 'notification:show',
        source: 'shop-panel',
        data: {
          message: `Purchased ${itemDef?.displayName || itemId} for ${result.totalPrice} currency`,
          type: 'success',
          duration: 2000,
        },
      });
    }
  }

  private handleSell(world: World, itemId: string): void {
    if (!this.selectedShopId || !this.selectedAgentId) {
      return;
    }

    // Get TradingSystem
    const tradingSystem = (world as any).getSystem?.('trading');
    if (!tradingSystem || !('sellToShop' in tradingSystem)) {
      console.error('TradingSystem not found');
      return;
    }

    // Sell one item
    const result = (tradingSystem as any).sellToShop(
      world,
      this.selectedAgentId,
      this.selectedShopId,
      itemId,
      1
    );

    if (!result.success) {
      console.warn('Sale failed:', result.reason);
      world.eventBus.emit({
        type: 'notification:show',
        source: 'shop-panel',
        data: {
          message: result.reason || 'Sale failed',
          type: 'error',
          duration: 3000,
        },
      });
    } else {
      const itemDef = itemRegistry.get(itemId);
      world.eventBus.emit({
        type: 'notification:show',
        source: 'shop-panel',
        data: {
          message: `Sold ${itemDef?.displayName || itemId} for ${result.totalPrice} currency`,
          type: 'success',
          duration: 2000,
        },
      });
    }
  }
}
