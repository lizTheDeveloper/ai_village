
/**
 * UI Panel displaying village resources and stockpile.
 * Shows total resources across all storage buildings.
 */
export class ResourcesPanel {
  private panelWidth = 280;
  private panelHeight = 200;
  private padding = 10;
  private lineHeight = 18;
  private isCollapsed = false;

  /**
   * Render the resources panel.
   * @param ctx Canvas rendering context
   * @param canvasWidth Width of the canvas
   * @param world World instance to query storage buildings
   * @param agentPanelOpen Whether the agent info panel is currently open
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, world: any, agentPanelOpen = false): void {
    // Position in top-right corner, below agent panel if it's open
    const x = canvasWidth - this.panelWidth - 20;
    const y = agentPanelOpen ? 540 : 20; // Agent panel is ~520px tall, add 20px spacing

    // Draw panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    const headerHeight = 30;
    const bodyHeight = this.isCollapsed ? 0 : this.panelHeight - headerHeight;
    ctx.fillRect(x, y, this.panelWidth, headerHeight + bodyHeight);

    // Draw panel border
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.7)'; // Brown border for resources
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.panelWidth, headerHeight + bodyHeight);

    // Set up text rendering
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + this.padding;

    // Title with collapse button
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    const title = this.isCollapsed ? '▶ VILLAGE STOCKPILE' : '▼ VILLAGE STOCKPILE';
    ctx.fillText(title, x + this.padding, currentY);
    ctx.font = '14px monospace';

    if (this.isCollapsed) {
      return;
    }

    currentY += headerHeight;

    // Get resources from all storage buildings
    const resources = this.aggregateStorageResources(world);

    if (Object.keys(resources).length === 0) {
      // No storage or empty storage
      ctx.fillStyle = '#888888';
      ctx.fillText('No storage buildings', x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillText('or stockpile is empty', x + this.padding, currentY);
    } else {
      // Display resources sorted by type
      const resourceEntries = Object.entries(resources).sort((a, b) => a[0].localeCompare(b[0]));

      for (const [itemId, quantity] of resourceEntries) {
        // Color code by resource type
        let color = '#FFFFFF';
        let icon = '📦';

        if (itemId === 'wood') {
          color = '#8B4513';
          icon = '🪵';
        } else if (itemId === 'stone') {
          color = '#808080';
          icon = '🪨';
        } else if (itemId === 'food') {
          color = '#90EE90';
          icon = '🍎';
        } else if (itemId === 'water') {
          color = '#4169E1';
          icon = '💧';
        } else if (itemId.includes('seed')) {
          color = '#8B4513';
          icon = '🌰';
        } else if (itemId.includes('fiber') || itemId.includes('cloth')) {
          color = '#DEB887';
          icon = '🧵';
        }

        ctx.fillStyle = color;
        ctx.fillText(`${icon} ${itemId}: ${quantity}`, x + this.padding, currentY);
        currentY += this.lineHeight;
      }
    }

    // Show total storage capacity info
    const storageInfo = this.getStorageCapacityInfo(world);
    if (storageInfo) {
      currentY += 5;
      ctx.fillStyle = '#CCCCCC';
      ctx.font = '12px monospace';
      ctx.fillText(storageInfo, x + this.padding, currentY);
      ctx.font = '14px monospace';
    }
  }

  private lastResourcesSnapshot: string = '';
  private debugLoggingEnabled: boolean = false; // Set to true for debugging only

  /**
   * Aggregate all resources across all storage buildings.
   */
  private aggregateStorageResources(world: any): Record<string, number> {
    if (!world || typeof world.query !== 'function') {
      return {};
    }

    const totalResources: Record<string, number> = {};

    // Find all storage buildings
    const storageBuildings = world.query()
      .with('building')
      .with('inventory')
      .executeEntities();

    // Only log if debug logging is enabled
    if (this.debugLoggingEnabled) {
      console.log(`[ResourcesPanel] Found ${storageBuildings.length} buildings with building+inventory components`);
    }

    for (const storage of storageBuildings) {
      const building = storage.getComponent('building');
      const inventory = storage.getComponent('inventory');

      // Only count complete storage buildings
      if (!building?.isComplete) {
        continue;
      }
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box') {
        continue;
      }

      if (inventory?.slots) {
        for (const slot of inventory.slots) {
          if (slot.itemId && slot.quantity > 0) {
            totalResources[slot.itemId] = (totalResources[slot.itemId] || 0) + slot.quantity;
          }
        }
      }
    }

    // Only log when resources actually change (not every frame)
    const currentSnapshot = JSON.stringify(totalResources);
    if (this.debugLoggingEnabled && currentSnapshot !== this.lastResourcesSnapshot) {
      console.log(`[ResourcesPanel] Resources changed:`, totalResources);
      this.lastResourcesSnapshot = currentSnapshot;
    }

    return totalResources;
  }

  /**
   * Get storage capacity information.
   */
  private getStorageCapacityInfo(world: any): string | null {
    if (!world || typeof world.query !== 'function') {
      return null;
    }

    const storageBuildings = world.query()
      .with('building')
      .with('inventory')
      .executeEntities();

    let totalBuildings = 0;
    let usedSlots = 0;
    let totalSlots = 0;

    for (const storage of storageBuildings) {
      const building = storage.getComponent('building');
      const inventory = storage.getComponent('inventory');

      if (!building?.isComplete) continue;
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box') continue;

      totalBuildings++;

      if (inventory?.slots) {
        totalSlots += inventory.maxSlots || inventory.slots.length;
        usedSlots += inventory.slots.filter((s: any) => s.itemId && s.quantity > 0).length;
      }
    }

    if (totalBuildings === 0) {
      return null;
    }

    return `${totalBuildings} storage(s) • ${usedSlots}/${totalSlots} slots used`;
  }

  /**
   * Handle click events on the panel.
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param canvasWidth Width of the canvas
   * @param agentPanelOpen Whether the agent info panel is currently open
   * @returns True if click was handled
   */
  handleClick(screenX: number, screenY: number, canvasWidth: number, agentPanelOpen = false): boolean {
    const x = canvasWidth - this.panelWidth - 20;
    const y = agentPanelOpen ? 540 : 20; // Match render positioning
    const headerHeight = 30;

    // Check if click is on header (for collapse/expand)
    if (
      screenX >= x &&
      screenX <= x + this.panelWidth &&
      screenY >= y &&
      screenY <= y + headerHeight
    ) {
      this.isCollapsed = !this.isCollapsed;
      return true;
    }

    return false;
  }

  /**
   * Toggle collapsed state.
   */
  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
