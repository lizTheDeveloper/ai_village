import type { World, ShopComponent, EntityId, InventoryComponent, CurrencyComponent, MarketStateComponent } from '@ai-village/core';
import { EntityImpl } from '@ai-village/core';
import { itemRegistry, calculateBuyPrice, calculateSellPrice, getQualityTier, getQualityColor, getQualityDisplayName, getQualityPriceMultiplier } from '@ai-village/core';

/**
 * Interface for TradingSystem methods used by ShopPanel.
 * Avoids needing to import the full TradingSystem class.
 */
interface TradingSystemMethods {
  buyFromShop(
    world: World,
    buyerId: EntityId,
    shopId: EntityId,
    itemId: string,
    quantity: number
  ): { success: boolean; totalPrice?: number; reason?: string };

  sellToShop(
    world: World,
    sellerId: EntityId,
    shopId: EntityId,
    itemId: string,
    quantity: number
  ): { success: boolean; totalPrice?: number; reason?: string };
}

/**
 * Extended World interface that includes getSystem method.
 * The public World interface doesn't expose this, but the implementation has it.
 */
interface WorldWithSystems extends World {
  getSystem?(systemId: string): unknown;
}

interface ShopItem {
  itemId: string;
  quantity: number;
  price: number;
  affordable: boolean;
  quality?: number;
}

interface SellableItem {
  itemId: string;
  quantity: number;
  price: number;
  quality?: number;
  slotIndex: number;
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
  private buyButtons: Array<{ itemId: string; quality?: number; x: number; y: number; width: number; height: number }> = [];
  private sellButtons: Array<{ itemId: string; quality?: number; slotIndex: number; x: number; y: number; width: number; height: number }> = [];

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

  render(ctx: CanvasRenderingContext2D, world: World | undefined): void {
    if (!this.visible || !this.selectedShopId || !this.selectedAgentId || !world) {
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
      ? marketEntities[0].components.get('market_state') as MarketStateComponent | undefined
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

      // Shop stock doesn't track quality per-item, use default quality
      const quality = 50; // Default quality for shop stock
      const price = calculateBuyPrice({ definition: itemDef, quality }, shop, marketState);
      const affordable = agentCurrency.balance >= price;

      shopItems.push({
        itemId: stock.itemId,
        quantity: stock.quantity,
        price,
        affordable,
        quality,
      });
    }

    // Render shop items
    for (const item of shopItems) {
      const itemDef = itemRegistry.get(item.itemId);
      if (!itemDef) continue;

      ctx.font = '14px sans-serif';
      ctx.fillStyle = item.affordable ? '#fff' : '#888';
      ctx.textAlign = 'left';

      // Build display string with quality
      let displayText = `${itemDef.displayName} x${item.quantity}`;
      if (item.quality !== undefined) {
        const tier = getQualityTier(item.quality);
        const tierName = getQualityDisplayName(tier);
        displayText += ` [${tierName}]`;
      }
      displayText += ` - ${item.price} currency`;

      ctx.fillText(displayText, panelX + 20, yOffset);

      // Draw quality color indicator
      if (item.quality !== undefined) {
        const tier = getQualityTier(item.quality);
        const color = getQualityColor(tier);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(panelX + 12, yOffset - 4, 4, 0, Math.PI * 2);
        ctx.fill();
      }

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

    // Get sellable items - show each quality stack separately
    const sellableItems: SellableItem[] = [];

    for (let i = 0; i < agentInventory.slots.length; i++) {
      const slot = agentInventory.slots[i];
      if (!slot || !slot.itemId || slot.quantity <= 0) continue;

      const itemDef = itemRegistry.get(slot.itemId);
      if (!itemDef) continue;

      const quality = slot.quality;
      const price = calculateSellPrice({ definition: itemDef, quality }, shop, marketState);

      sellableItems.push({
        itemId: slot.itemId,
        quantity: slot.quantity,
        price,
        quality,
        slotIndex: i,
      });
    }

    // Render sellable items
    for (const item of sellableItems) {
      const itemDef = itemRegistry.get(item.itemId);
      if (!itemDef) continue;

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';

      // Build display string with quality
      let displayText = `${itemDef.displayName} x${item.quantity}`;
      if (item.quality !== undefined) {
        const tier = getQualityTier(item.quality);
        const tierName = getQualityDisplayName(tier);
        const multiplier = getQualityPriceMultiplier(item.quality);
        displayText += ` [${tierName}] (${multiplier.toFixed(1)}x)`;
      }
      displayText += ` - ${item.price} currency`;

      ctx.fillText(displayText, panelX + 20, yOffset);

      // Draw quality color indicator
      if (item.quality !== undefined) {
        const tier = getQualityTier(item.quality);
        const color = getQualityColor(tier);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(panelX + 12, yOffset - 4, 4, 0, Math.PI * 2);
        ctx.fill();
      }

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
        quality: item.quality,
        slotIndex: item.slotIndex,
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

  private handleBuy(world: World | undefined, itemId: string): void {
    if (!this.selectedShopId || !this.selectedAgentId || !world) {
      return;
    }

    // Get TradingSystem
    const worldWithSystems = world as WorldWithSystems;
    const tradingSystem = worldWithSystems.getSystem?.('trading');
    if (!tradingSystem || typeof tradingSystem !== 'object' || !('buyFromShop' in tradingSystem)) {
      console.error('TradingSystem not found');
      return;
    }

    // Buy one item
    const typedTradingSystem = tradingSystem as TradingSystemMethods;
    const result = typedTradingSystem.buyFromShop(
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

  private handleSell(world: World | undefined, itemId: string): void {
    if (!this.selectedShopId || !this.selectedAgentId || !world) {
      return;
    }

    // Get TradingSystem
    const worldWithSystems = world as WorldWithSystems;
    const tradingSystem = worldWithSystems.getSystem?.('trading');
    if (!tradingSystem || typeof tradingSystem !== 'object' || !tradingSystem || !('sellToShop' in tradingSystem)) {
      console.error('TradingSystem not found');
      return;
    }

    // Sell one item
    const typedTradingSystem = tradingSystem as TradingSystemMethods;
    const result = typedTradingSystem.sellToShop(
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
