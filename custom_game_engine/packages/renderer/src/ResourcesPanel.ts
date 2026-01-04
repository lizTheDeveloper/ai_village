import type { World, InventorySlot, BuildingComponent, InventoryComponent } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

/**
 * UI Panel displaying village resources and stockpile.
 * Shows total resources across all storage buildings.
 */
export class ResourcesPanel implements IWindowPanel {
  private visible: boolean = false;
  private panelWidth = 280;
  private padding = 10;
  private lineHeight = 18;
  private isCollapsed = false;

  /**
   * Render the resources panel.
   * @param ctx Canvas rendering context
   * @param _canvasWidth Width of the canvas (unused - WindowManager handles positioning)
   * @param world World instance to query storage buildings
   * @param _agentPanelOpen Whether the agent info panel is currently open (unused)
   */

  getId(): string {
    return 'resources';
  }

  getTitle(): string {
    return 'Resources';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 500;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  render(ctx: CanvasRenderingContext2D, _canvasWidth: number, world: World, _agentPanelOpen = false): void {
    // WindowManager handles positioning via translate, so render at (0, 0)
    const x = 0;
    const y = 0;
    const headerHeight = 30;

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
  private aggregateStorageResources(world: World): Record<string, number> {
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
    }

    for (const storage of storageBuildings) {
      const building = storage.components.get('building') as BuildingComponent | undefined;
      const inventory = storage.components.get('inventory') as InventoryComponent | undefined;

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
      this.lastResourcesSnapshot = currentSnapshot;
    }

    return totalResources;
  }

  /**
   * Get storage capacity information.
   */
  private getStorageCapacityInfo(world: World): string | null {
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
      const building = storage.components.get('building') as BuildingComponent | undefined;
      const inventory = storage.components.get('inventory') as InventoryComponent | undefined;

      if (!building?.isComplete) continue;
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box') continue;

      totalBuildings++;

      if (inventory?.slots) {
        totalSlots += inventory.maxSlots || inventory.slots.length;
        usedSlots += inventory.slots.filter((s: InventorySlot) => s.itemId && s.quantity > 0).length;
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
